import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getDb } from "@/db/client";
import { aiClassifications, authorAliases, authors, editions, importJobItems, importJobs, publishers, rankingEntries, rankingSnapshots, relatedBooks, sourceRecords, tags, themes, workAuthors, workTags, workThemes, works } from "@/db/schema";
import { classifyMetadata, type AutoTheme } from "@/lib/book-intelligence";
import { books } from "@/lib/catalog";
import { currentRanking, rankingPeriod } from "@/lib/current-ranking";
import { fetchGoogleBookWithFallback, supplementFromOpenLibrary, type ImportedEdition } from "@/lib/import-sources";
import { normalizePublisherName } from "@/lib/normalization-dictionaries";
import { calculateQualityScore, calculateRecommendScore } from "@/lib/scores";
import { normalizeIsbn, normalizeSearchText, slugify } from "@/lib/text-normalization";

const FREE_CLASSIFIER_MODEL = "rule-based-keyword-v1";
const FREE_CLASSIFIER_PROMPT_VERSION = "free-v1";
const FREE_CLASSIFIER_VERSION = 1;
const THEME_SLUGS: Record<AutoTheme, string> = { "ミステリー": "mystery", "恋愛": "romance", "自己啓発": "self-help" };

async function ensureThemeId(db: ReturnType<typeof getDb>, name: AutoTheme) {
  const slug = THEME_SLUGS[name];
  const existing = (await db.select({ id: themes.id }).from(themes).where(eq(themes.slug, slug)).limit(1))[0];
  if (existing) return existing.id;
  await db.insert(themes).values({ slug, name }).onConflictDoNothing();
  return (await db.select({ id: themes.id }).from(themes).where(eq(themes.slug, slug)).limit(1))[0]?.id;
}

async function ensureTagId(db: ReturnType<typeof getDb>, name: string) {
  const slug = slugify(name);
  const existing = (await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1))[0];
  if (existing) return existing.id;
  await db.insert(tags).values({ slug, name }).onConflictDoNothing();
  return (await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1))[0]?.id;
}

async function classifyAndTagWork(workId: string, book: { title: string; authors: string[]; synopsis: string; publisher?: string; categories: string[] }) {
  const db = getDb();
  const intelligence = classifyMetadata({ title: book.title, authors: book.authors, description: book.synopsis, publisher: book.publisher, categories: book.categories });
  if (!intelligence.themes.length && !intelligence.tags.length) return;
  const sourceHash = createHash("sha256").update(JSON.stringify({ title: book.title, authors: book.authors, synopsis: book.synopsis, publisher: book.publisher, categories: book.categories })).digest("hex");
  const [classification] = await db.insert(aiClassifications).values({
    workId, model: FREE_CLASSIFIER_MODEL, promptVersion: FREE_CLASSIFIER_PROMPT_VERSION, sourceHash,
    confidence: intelligence.confidence, classificationVersion: FREE_CLASSIFIER_VERSION,
    result: { themes: intelligence.themes, tags: intelligence.tags, contentQuality: intelligence.confidence },
  }).onConflictDoNothing().returning({ id: aiClassifications.id });
  if (!classification) return;
  for (const themeName of intelligence.themes) {
    const themeId = await ensureThemeId(db, themeName);
    if (themeId) await db.insert(workThemes).values({ workId, themeId, classificationId: classification.id, confidence: intelligence.confidence }).onConflictDoNothing();
  }
  for (const tagName of intelligence.tags) {
    const tagId = await ensureTagId(db, tagName);
    if (tagId) await db.insert(workTags).values({ workId, tagId, classificationId: classification.id }).onConflictDoNothing();
  }
}

export async function refreshRelatedBooks(workId: string) {
  const db = getDb();
  const candidates = await db.execute(sql`
    with target as (
      select w.normalized_title, e.publisher_id,
        coalesce((select array_agg(lower(c)) from source_records sr,
          lateral jsonb_array_elements_text(coalesce(sr.payload->'volumeInfo'->'categories','[]'::jsonb)) c
          where sr.edition_id=e.id), array[]::text[]) categories
      from works w join editions e on e.work_id=w.id and e.is_primary=true
      where w.id=${workId} limit 1
    ), candidates as (
      select w.id, w.recommend_score,
        case when exists(select 1 from work_authors a join work_authors b on a.author_id=b.author_id where a.work_id=${workId} and b.work_id=w.id) then 1 else 0 end same_author,
        case when target.publisher_id is not null and target.publisher_id=e.publisher_id then 1 else 0 end same_publisher,
        case when exists(select 1 from source_records sr,
          lateral jsonb_array_elements_text(coalesce(sr.payload->'volumeInfo'->'categories','[]'::jsonb)) c
          where sr.edition_id=e.id and lower(c)=any(target.categories)) then 1 else 0 end same_category,
        case when length(regexp_replace(target.normalized_title,'[0-9０-９]+.*$','','g'))>=4
          and regexp_replace(target.normalized_title,'[0-9０-９]+.*$','','g')=regexp_replace(w.normalized_title,'[0-9０-９]+.*$','','g') then 1 else 0 end same_series
      from target, works w join editions e on e.work_id=w.id and e.is_primary=true
      where w.id<>${workId} and w.status='ready'
    ) select * from candidates where same_author+same_publisher+same_category+same_series>0
      order by (same_author*.45+same_category*.3+same_publisher*.15+same_series*.1+recommend_score*.1) desc limit 20
  `);
  await db.delete(relatedBooks).where(eq(relatedBooks.workId, workId));
  const values = candidates.rows.map((raw) => {
    const row = raw as { id: string; recommend_score: number; same_author: number; same_publisher: number; same_category: number; same_series: number };
    const author = Number(row.same_author); const category = Number(row.same_category); const publisher = Number(row.same_publisher); const series = Number(row.same_series); const popularity = Number(row.recommend_score);
    return { workId, relatedWorkId: row.id, score: author * .45 + category * .3 + publisher * .15 + series * .1 + popularity * .1,
      reason: { vector: 0, themes: category, tags: Math.max(publisher, series), author, popularity } };
  });
  if (values.length) await db.insert(relatedBooks).values(values).onConflictDoNothing();
  return values.length;
}

async function updateQuality(workId: string, book: ImportedEdition) {
  const quality = calculateQualityScore({ hasCover: Boolean(book.coverUrl), hasSynopsis: Boolean(book.synopsis), hasPublisher: Boolean(book.publisher), authorCount: book.authors.length, classificationConfidence: 0 });
  const recommendScore = calculateRecommendScore({ quality, popularity: 0, freshness: .5, diversity: .5 });
  await getDb().update(works).set({ qualityScore: quality, recommendScore, status: quality >= .3 ? "ready" : "draft", updatedAt: new Date() }).where(eq(works.id, workId));
}

export type ImportOutcome = { workId: string; imported: boolean; skipped: boolean; classified: false; embedded: false; related: number; searchMethod: string; apiErrorCount: number; durationMs: number };

export async function enqueueIsbnImport(isbns: string[]) {
  const db = getDb();
  const [job] = await db.insert(importJobs).values({ kind: "isbn_batch_free_v1", payload: { count: isbns.length } }).returning({ id: importJobs.id });
  if (!job) throw new Error("Failed to create import job");
  await db.insert(importJobItems).values([...new Set(isbns)].map((isbn) => ({ jobId: job.id, sourceKey: isbn }))).onConflictDoNothing();
  return job.id;
}

export async function resumeImportJob(jobId: string) {
  const db = getDb();
  await db.update(importJobItems).set({ status: "queued", error: null, processedAt: null }).where(and(eq(importJobItems.jobId, jobId), inArray(importJobItems.status, ["failed", "retry"])));
  await db.update(importJobs).set({ status: "queued", lockedAt: null, lockedBy: null, lastError: null, nextRunAt: new Date(), completedAt: null, updatedAt: new Date() }).where(eq(importJobs.id, jobId));
}

export async function importJobReport(jobId: string) {
  const db = getDb();
  const job = (await db.select().from(importJobs).where(eq(importJobs.id, jobId)).limit(1))[0];
  if (!job) return null;
  const items = await db.select().from(importJobItems).where(eq(importJobItems.jobId, jobId));
  const outcomes = items.flatMap((item) => { try { return item.error?.startsWith("{") ? [JSON.parse(item.error) as ImportOutcome] : []; } catch { return []; } });
  const methodCounts = Object.fromEntries([...new Set(outcomes.map((item) => item.searchMethod))].map((method) => [method, outcomes.filter((item) => item.searchMethod === method).length]));
  return { jobId, status: job.status, requested: items.length, imported: outcomes.filter((item) => item.imported).length, skipped: outcomes.filter((item) => item.skipped).length,
    retryPending: items.filter((item) => item.status === "retry").length, failed: items.filter((item) => item.status === "failed").length,
    methodCounts, apiErrors: outcomes.reduce((sum, item) => sum + item.apiErrorCount, 0), averageImportMs: outcomes.length ? Math.round(outcomes.reduce((sum, item) => sum + item.durationMs, 0) / outcomes.length) : null };
}

export async function claimImportJob(workerId: string) {
  const result = await getDb().execute(sql`with candidate as (select id from import_jobs where status in ('queued','retry') and next_run_at<=now() and (locked_at is null or locked_at<now()-interval '10 minutes') order by created_at for update skip locked limit 1)
    update import_jobs j set status='running',locked_at=now(),locked_by=${workerId},attempts=j.attempts+1,started_at=coalesce(j.started_at,now()),updated_at=now() from candidate where j.id=candidate.id returning j.id`);
  return (result.rows[0] as { id?: string } | undefined)?.id;
}

export async function importIsbn(isbn: string, options: { enrich?: boolean } = {}): Promise<ImportOutcome> {
  const started = Date.now(); const db = getDb(); const normalizedIsbn = normalizeIsbn(isbn);
  const cached = await db.select({ workId: editions.workId }).from(editions).where(eq(editions.isbn13, normalizedIsbn)).limit(1);
  if (cached[0]) return { workId: cached[0].workId, imported: false, skipped: true, classified: false, embedded: false, related: 0, searchMethod: "db_cache", apiErrorCount: 0, durationMs: Date.now() - started };
  const hint = [...books, ...currentRanking].find((item) => normalizeIsbn(item.isbn) === normalizedIsbn);
  const google = await fetchGoogleBookWithFallback({ isbn: normalizedIsbn, title: hint?.title, authors: hint?.author ? [hint.author] : undefined });
  const book = google.book ? await supplementFromOpenLibrary(google.book) : null;
  if (!book) throw new Error(`Google Books not found: ${normalizedIsbn}`);
  const payloadHash = createHash("sha256").update(JSON.stringify(book.raw)).digest("hex");
  const existingEdition = await db.select({ id: editions.id, workId: editions.workId }).from(editions).where(eq(editions.isbn13, book.isbn13)).limit(1);
  if (existingEdition[0]) {
    await db.insert(sourceRecords).values({ provider: "google_books", externalId: book.externalId, editionId: existingEdition[0].id, payloadHash, payload: book.raw as Record<string, unknown> }).onConflictDoUpdate({ target: [sourceRecords.provider, sourceRecords.externalId], set: { payloadHash, payload: book.raw as Record<string, unknown>, fetchedAt: new Date() } });
    for (const source of book.supplementSources ?? []) {
      const supplementHash = createHash("sha256").update(JSON.stringify(source.raw)).digest("hex");
      await db.insert(sourceRecords).values({ provider: source.provider, externalId: source.externalId, editionId: existingEdition[0].id, payloadHash: supplementHash, payload: source.raw }).onConflictDoUpdate({ target: [sourceRecords.provider, sourceRecords.externalId], set: { editionId: existingEdition[0].id, payloadHash: supplementHash, payload: source.raw, fetchedAt: new Date() } });
    }
    if (options.enrich !== false) { await updateQuality(existingEdition[0].workId, book); await classifyAndTagWork(existingEdition[0].workId, book); }
    return { workId: existingEdition[0].workId, imported: false, skipped: true, classified: false, embedded: false, related: 0, searchMethod: book.searchMethod ?? "unknown", apiErrorCount: book.apiErrorCount ?? google.apiErrorCount, durationMs: Date.now() - started };
  }
  const authorRows = [];
  for (const name of book.authors) {
    const normalizedName = normalizeSearchText(name);
    const row = (await db.select().from(authors).where(eq(authors.normalizedName, normalizedName)).limit(1))[0]
      ?? (await db.insert(authors).values({ slug: slugify(name), name, normalizedName }).onConflictDoNothing().returning())[0]
      ?? (await db.select().from(authors).where(eq(authors.normalizedName, normalizedName)).limit(1))[0];
    if (row) { authorRows.push(row); await db.insert(authorAliases).values({ authorId: row.id, name, normalizedName }).onConflictDoNothing(); }
  }
  const normalizedTitle = normalizeSearchText(book.title);
  const matching = authorRows.length ? await db.select({ id: works.id }).from(works).innerJoin(workAuthors, eq(workAuthors.workId, works.id)).where(and(eq(works.normalizedTitle, normalizedTitle), eq(workAuthors.authorId, authorRows[0].id))).limit(2) : [];
  const workId = matching.length === 1 ? matching[0].id : (await db.insert(works).values({ slug: `${slugify(book.title)}-${book.isbn13.slice(-6)}`, title: book.title, normalizedTitle, synopsis: book.synopsis, language: book.language ?? "ja" }).returning({ id: works.id }))[0].id;
  for (const [position, author] of authorRows.entries()) await db.insert(workAuthors).values({ workId, authorId: author.id, position }).onConflictDoNothing();
  let publisherId: string | undefined;
  if (book.publisher) { const publisherName = normalizePublisherName(book.publisher); const normalizedName = normalizeSearchText(publisherName); const publisher = (await db.select().from(publishers).where(eq(publishers.normalizedName, normalizedName)).limit(1))[0] ?? (await db.insert(publishers).values({ name: publisherName, normalizedName }).onConflictDoNothing().returning())[0]; publisherId = publisher?.id; }
  const [edition] = await db.insert(editions).values({ workId, isbn10: book.isbn10, isbn13: book.isbn13, publisherId, publicationDate: book.publicationDate, coverUrl: book.coverUrl, isPrimary: true, rakutenUrl: book.rakutenUrl }).returning({ id: editions.id });
  await db.insert(sourceRecords).values({ provider: "google_books", externalId: book.externalId, editionId: edition.id, payloadHash, payload: book.raw as Record<string, unknown> }).onConflictDoNothing();
  for (const source of book.supplementSources ?? []) {
    const supplementHash = createHash("sha256").update(JSON.stringify(source.raw)).digest("hex");
    await db.insert(sourceRecords).values({ provider: source.provider, externalId: source.externalId, editionId: edition.id, payloadHash: supplementHash, payload: source.raw }).onConflictDoUpdate({ target: [sourceRecords.provider, sourceRecords.externalId], set: { editionId: edition.id, payloadHash: supplementHash, payload: source.raw, fetchedAt: new Date() } });
  }
  if (options.enrich !== false) { await updateQuality(workId, book); await classifyAndTagWork(workId, book); }
  return { workId, imported: true, skipped: false, classified: false, embedded: false, related: 0, searchMethod: book.searchMethod ?? "unknown", apiErrorCount: book.apiErrorCount ?? google.apiErrorCount, durationMs: Date.now() - started };
}

export async function refreshDerivedData(workIds: string[]) {
  const db = getDb(); let relatedUpdated = 0; for (const workId of workIds) relatedUpdated += await refreshRelatedBooks(workId);
  await db.execute(sql`update authors a set popularity_score=least(1,x.book_count/10.0),updated_at=now() from (select author_id,count(*)::real book_count from work_authors group by author_id)x where a.id=x.author_id`);
  const rankingIsbns = currentRanking.map((book) => book.isbn); const rankingWorks = await db.select({ isbn: editions.isbn13, workId: editions.workId }).from(editions).where(inArray(editions.isbn13, rankingIsbns)); const byIsbn = new Map(rankingWorks.map((row) => [row.isbn, row.workId]));
  let snapshot = (await db.select({ id: rankingSnapshots.id }).from(rankingSnapshots).where(and(eq(rankingSnapshots.source, "rakuten"), eq(rankingSnapshots.period, rankingPeriod))).limit(1))[0];
  if (!snapshot) [snapshot] = await db.insert(rankingSnapshots).values({ source: "rakuten", label: "今売れている本 TOP20", period: rankingPeriod, capturedAt: new Date() }).returning({ id: rankingSnapshots.id });
  await db.delete(rankingEntries).where(eq(rankingEntries.snapshotId, snapshot.id)); const rankingValues = currentRanking.flatMap((book, index) => { const id = byIsbn.get(book.isbn); return id ? [{ snapshotId: snapshot.id, workId: id, rank: index + 1 }] : []; }); if (rankingValues.length) await db.insert(rankingEntries).values(rankingValues);
  const authorCount = workIds.length ? await db.select({ count: sql<number>`count(distinct ${workAuthors.authorId})::int` }).from(workAuthors).where(inArray(workAuthors.workId, workIds)) : [{ count: 0 }];
  return { relatedUpdated, rankingUpdated: rankingValues.length, authorsUpdated: authorCount[0]?.count ?? 0, themesUpdated: 0 };
}

export async function finalizeImportJob(jobId: string) { const completed = await getDb().select({ workId: importJobItems.workId }).from(importJobItems).where(and(eq(importJobItems.jobId, jobId), eq(importJobItems.status, "completed"))); return refreshDerivedData([...new Set(completed.map((row) => row.workId).filter((id): id is string => Boolean(id)))]); }

export async function processImportJob(jobId: string, batchSize = 25, timeBudgetMs = 45_000) {
  const db = getDb();
  const startedAt = Date.now();
  const items = await db.select().from(importJobItems).where(and(eq(importJobItems.jobId, jobId), inArray(importJobItems.status, ["queued", "retry"]))).limit(Math.min(50, Math.max(1, batchSize)));
  let processed = 0;
  for (const item of items) {
    // サーバーレス関数の実行時間制限(Vercel Hobbyは60秒)に収まるよう、時間切れなら残りは次回実行に持ち越す
    if (Date.now() - startedAt > timeBudgetMs) break;
    processed += 1;
    try { const outcome = await importIsbn(item.sourceKey); await db.update(importJobItems).set({ status: "completed", workId: outcome.workId, error: JSON.stringify(outcome), processedAt: new Date() }).where(eq(importJobItems.id, item.id)); } catch (error) { const retry = /retry pending|429|503/i.test(error instanceof Error ? error.message : String(error)); await db.update(importJobItems).set({ status: retry ? "retry" : "failed", error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error", processedAt: new Date() }).where(eq(importJobItems.id, item.id)); }
  }
  const remaining = await db.select({ count: sql<number>`count(*)::int` }).from(importJobItems).where(and(eq(importJobItems.jobId, jobId), inArray(importJobItems.status, ["queued", "retry"]))); const finalization = remaining[0]?.count ? undefined : await finalizeImportJob(jobId);
  await db.update(importJobs).set(remaining[0]?.count ? { status: "retry", lockedAt: null, lockedBy: null, nextRunAt: new Date(Date.now() + 60_000), updatedAt: new Date() } : { status: "completed", payload: { finalization }, lockedAt: null, lockedBy: null, completedAt: new Date(), updatedAt: new Date() }).where(eq(importJobs.id, jobId)); revalidateTag("catalog", "max"); return { processed, remaining: remaining[0]?.count ?? 0, finalization };
}