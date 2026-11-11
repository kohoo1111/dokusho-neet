import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDb, isDatabaseConfigured } from "@/db/client";
import { authorAliases, authors, bookStats, editions, publishers, rankingEntries, rankingSnapshots, relatedBooks, themes, workAuthors, works, workThemes } from "@/db/schema";
import { authors as catalogAuthorList, books, booksByAuthor, booksForTheme, relatedBooks as relatedCatalogBooks, type Book } from "@/lib/catalog";
import { currentRanking } from "@/lib/current-ranking";
import { normalizeSearchText } from "@/lib/text-normalization";
import { selectWeighted } from "@/lib/scores";

export type CatalogBook = Book & { databaseId?: string };

// DATABASE_URL の無いローカル開発では、同梱の厳選カタログで画面を確認できるようにする。
// 本番ビルド（NODE_ENV=production）では決して使わない。
const previewMode = () => !isDatabaseConfigured() && process.env.NODE_ENV !== "production";
const previewBook = (book: Book): CatalogBook => ({ ...book, databaseId: `preview:${book.id}` });
type DatabaseBook = CatalogBook & { popularity: number; quality: number; recommend: number; views: number; lastShownAt: Date | null };

const dbShelf = unstable_cache(async (themeSlug?: string) => {
  const db = getDb();
  const rows = await db.select({
    id: works.id, slug: works.slug, title: works.title, synopsis: works.synopsis, author: authors.name, authorSlug: authors.slug,
    isbn: editions.isbn13, isbn10: editions.isbn10, coverImage: editions.coverUrl, rakutenUrl: editions.rakutenUrl, publisher: sql<string | null>`null`, quality: works.qualityScore,
    recommend: works.recommendScore, popularity: bookStats.popularityScore, views: bookStats.views, lastShownAt: bookStats.lastShownAt,
  }).from(works)
    .innerJoin(workAuthors, eq(workAuthors.workId, works.id)).innerJoin(authors, eq(authors.id, workAuthors.authorId))
    .innerJoin(editions, and(eq(editions.workId, works.id), eq(editions.isPrimary, true)))
    .leftJoin(bookStats, eq(bookStats.workId, works.id))
    .leftJoin(workThemes, eq(workThemes.workId, works.id)).leftJoin(themes, eq(themes.id, workThemes.themeId))
    .where(themeSlug ? eq(themes.slug, themeSlug) : undefined)
    .orderBy(desc(works.recommendScore)).limit(200);
  return rows.map((row): DatabaseBook => ({
    id: row.slug, databaseId: row.id, title: row.title, author: row.author, authorSlug: row.authorSlug, isbn: row.isbn ?? "",
    synopsis: row.synopsis ?? "", genres: [], publishedYear: 0, coverImage: row.coverImage ?? undefined, isbn10: row.isbn10 ?? undefined, rakutenUrl: row.rakutenUrl ?? undefined, publisher: row.publisher ?? undefined,
    quality: row.quality, recommend: row.recommend, popularity: row.popularity ?? 0, views: row.views ?? 0, lastShownAt: row.lastShownAt,
  }));
}, ["catalog-shelf-v1"], { revalidate: 300, tags: ["catalog"] });

async function dbBooksByIsbns(isbns: string[], limit = 200): Promise<CatalogBook[]> {
  if (!isDatabaseConfigured() || !isbns.length) return [];
  try {
    const rows = await getDb().select({ work: works, edition: editions, author: authors, publisher: publishers.name }).from(works)
      .innerJoin(workAuthors, eq(workAuthors.workId, works.id)).innerJoin(authors, eq(authors.id, workAuthors.authorId))
      .innerJoin(editions, and(eq(editions.workId, works.id), eq(editions.isPrimary, true))).leftJoin(publishers, eq(publishers.id, editions.publisherId))
      .where(inArray(editions.isbn13, isbns)).limit(limit);
    const mapped = new Map(rows.map(({ work, edition, author, publisher }) => [edition.isbn13, ({ id: work.slug, databaseId: work.id, title: work.title, author: author.name, authorSlug: author.slug, isbn: edition.isbn13 ?? "", synopsis: work.synopsis ?? "", genres: [], publishedYear: 0, coverImage: edition.coverUrl ?? undefined, isbn10: edition.isbn10 ?? undefined, rakutenUrl: edition.rakutenUrl ?? undefined, publisher: publisher ?? undefined } satisfies CatalogBook)]));
    return isbns.flatMap((isbn) => mapped.get(isbn) ? [mapped.get(isbn)!] : []);
  } catch { return []; }
}

export async function rankingShelf(limit = 20): Promise<CatalogBook[]> {
  if (previewMode()) return currentRanking.slice(0, limit).map(previewBook);
  if (!isDatabaseConfigured()) return [];
  try {
    const latest = (await getDb().selectDistinct({ id: rankingSnapshots.id, capturedAt: rankingSnapshots.capturedAt }).from(rankingSnapshots)
      .innerJoin(rankingEntries, eq(rankingEntries.snapshotId, rankingSnapshots.id)).orderBy(desc(rankingSnapshots.capturedAt)).limit(1))[0];
    if (!latest) return [];
    const rows = await getDb().select({ isbn: editions.isbn13 }).from(rankingEntries)
      .innerJoin(editions, and(eq(editions.workId, rankingEntries.workId), eq(editions.isPrimary, true)))
      .where(eq(rankingEntries.snapshotId, latest.id)).orderBy(rankingEntries.rank).limit(limit);
    return dbBooksByIsbns(rows.map((row) => row.isbn).filter((isbn): isbn is string => Boolean(isbn)), limit);
  } catch { return []; }
}

export async function awardShelf(options: { name?: string; year?: number; limit?: number } = {}) {
  const selected = books.filter((book) => book.awards?.some((award) => (!options.name || award.name === options.name) && (!options.year || award.year === options.year)));
  if (previewMode()) return selected.slice(0, options.limit ?? 200).map(previewBook);
  const rows = await dbBooksByIsbns(selected.map((book) => book.isbn), options.limit ?? 200);
  return rows.map((row) => ({ ...row, awards: selected.find((book) => book.isbn === row.isbn)?.awards }));
}

export async function classicShelf(group: string, limit = 50) {
  if (previewMode()) return books.filter((book) => book.classicGroup === group).slice(0, limit).map(previewBook);
  return dbBooksByIsbns(books.filter((book) => book.classicGroup === group).map((book) => book.isbn), limit);
}

// 同じリクエスト内で generateMetadata・ページ本体・OGP画像から呼ばれても、DBへの問い合わせは1回で済ませる
export const bookRecord = cache(async (slug: string): Promise<CatalogBook | undefined> => {
  slug = decodeURIComponent(slug);
  if (previewMode()) { const found = [...books, ...currentRanking].find((book) => book.id === slug); return found ? previewBook(found) : undefined; }
  if (!isDatabaseConfigured()) return undefined;
  try {
    const row = (await getDb().select({ work: works, edition: editions, author: authors, publisher: publishers.name }).from(works)
      .innerJoin(workAuthors, eq(workAuthors.workId, works.id)).innerJoin(authors, eq(authors.id, workAuthors.authorId))
      .innerJoin(editions, and(eq(editions.workId, works.id), eq(editions.isPrimary, true))).leftJoin(publishers, eq(publishers.id, editions.publisherId))
      .where(eq(works.slug, slug)).limit(1))[0];
    if (!row) return undefined;
    const curated = books.find((book) => book.isbn === row.edition.isbn13);
    return { id: row.work.slug, databaseId: row.work.id, title: row.work.title, author: row.author.name, authorSlug: row.author.slug, isbn: row.edition.isbn13 ?? "", synopsis: row.work.synopsis ?? "", genres: [], publishedYear: 0, coverImage: row.edition.coverUrl ?? undefined, isbn10: row.edition.isbn10 ?? undefined, rakutenUrl: row.edition.rakutenUrl ?? undefined, publisher: row.publisher ?? undefined, awards: curated?.awards } satisfies CatalogBook;
  } catch { return undefined; }
});

export async function bookByIsbn(isbn: string) {
  return (await dbBooksByIsbns([isbn], 1))[0];
}

export async function sitemapDirectory() {
  if (!isDatabaseConfigured()) return { books: [] as string[], authors: [] as string[] };
  try {
    const [bookRows, authorRows] = await Promise.all([
      getDb().select({ slug: works.slug }).from(works).limit(50_000),
      getDb().select({ slug: authors.slug }).from(authors).where(eq(authors.status, "ready")).limit(10_000),
    ]);
    return { books: bookRows.map((row) => row.slug), authors: authorRows.map((row) => row.slug) };
  } catch { return { books: [], authors: [] }; }
}

export async function relatedWorkShelf(workId: string, limit = 8): Promise<CatalogBook[]> {
  if (previewMode()) { const source = books.find((book) => `preview:${book.id}` === workId); return source ? relatedCatalogBooks(source).slice(0, limit).map(previewBook) : books.slice(0, limit).map(previewBook); }
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await getDb().select({ isbn: editions.isbn13 }).from(relatedBooks)
      .innerJoin(editions, and(eq(editions.workId, relatedBooks.relatedWorkId), eq(editions.isPrimary, true)))
      .where(eq(relatedBooks.workId, workId)).orderBy(desc(relatedBooks.score)).limit(limit);
    return dbBooksByIsbns(rows.map((row) => row.isbn).filter((isbn): isbn is string => Boolean(isbn)), limit);
  } catch { return []; }
}

export async function discoveryShelf(options: { themeSlug?: string; fallbackTheme?: string; limit?: number; recentIds?: string[] } = {}): Promise<Book[]> {
  const limit = options.limit ?? 20;
  if (previewMode()) return (options.fallbackTheme ? booksForTheme(options.fallbackTheme) : books).slice(0, limit).map(previewBook);
  if (!isDatabaseConfigured()) return [];
  try {
    const candidates = await dbShelf(options.themeSlug);
    if (candidates.length) return selectWeighted(candidates, limit, new Set(options.recentIds ?? []));
    if (options.themeSlug) {
      const themeName = ({ mystery: "ミステリー", romance: "恋愛", "self-help": "自己啓発" } as Record<string, string>)[options.themeSlug];
      if (themeName) return (await dbBooksByIsbns(booksForTheme(themeName).map((book) => book.isbn), 200)).slice(0, limit);
    }
    return [];
  } catch {
    return [];
  }
}

export async function authorWorks(slug: string, limit = 20) {
  // 作家スラッグは日本語なのでURLではパーセントエンコードされる。
  // ここで戻さないと該当作家が引けず、作家ページの作品一覧が常に空になる。
  slug = decodeURIComponent(slug);
  if (previewMode()) return booksByAuthor(slug).slice(0, limit).map(previewBook);
  if (!isDatabaseConfigured()) return [];
  try {
    const db = getDb();
    const rows = await db.select({ work: works, edition: editions, author: authors }).from(authors)
      .innerJoin(workAuthors, eq(workAuthors.authorId, authors.id)).innerJoin(works, eq(works.id, workAuthors.workId))
      .innerJoin(editions, and(eq(editions.workId, works.id), eq(editions.isPrimary, true)))
      .where(eq(authors.slug, slug)).orderBy(desc(works.recommendScore)).limit(Math.max(5, limit));
    return rows.map(({ work, edition, author }): CatalogBook => ({ id: work.slug, databaseId: work.id, title: work.title, author: author.name, authorSlug: author.slug, isbn: edition.isbn13 ?? "", synopsis: work.synopsis ?? "", genres: [], publishedYear: 0, coverImage: edition.coverUrl ?? undefined, isbn10: edition.isbn10 ?? undefined, rakutenUrl: edition.rakutenUrl ?? undefined, publisher: undefined }));
  } catch { return []; }
}

export async function searchCatalog(query: string, limit = 30) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  if (previewMode()) return books.filter((book) => `${book.title} ${book.author}`.includes(query.trim())).slice(0, limit).map(previewBook);
  if (!isDatabaseConfigured()) return [];
  try {
  const db = getDb(); const pattern = `%${normalized}%`;
  const rows = await db.selectDistinct({ work: works, edition: editions, author: authors }).from(works)
    .innerJoin(workAuthors, eq(workAuthors.workId, works.id)).innerJoin(authors, eq(authors.id, workAuthors.authorId))
    .leftJoin(authorAliases, eq(authorAliases.authorId, authors.id)).innerJoin(editions, eq(editions.workId, works.id))
    .where(or(ilike(works.normalizedTitle, pattern), ilike(authors.normalizedName, pattern), ilike(authorAliases.normalizedName, pattern), eq(editions.isbn13, query.replace(/\D/g, ""))))
    .orderBy(desc(works.recommendScore)).limit(limit);
  return rows.map(({ work, edition, author }): CatalogBook => ({ id: work.slug, databaseId: work.id, title: work.title, author: author.name, authorSlug: author.slug, isbn: edition.isbn13 ?? "", synopsis: work.synopsis ?? "", genres: [], publishedYear: 0, coverImage: edition.coverUrl ?? undefined, isbn10: edition.isbn10 ?? undefined, rakutenUrl: edition.rakutenUrl ?? undefined }));
  } catch { return []; }
}

export async function authorDirectory(limit = 30) {
  if (previewMode()) return [...catalogAuthorList].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
  if (!isDatabaseConfigured()) return [];
  try { const db = getDb();
    const rows=await db.select({ slug: authors.slug, name: authors.name, kana: authors.normalizedName, popularity: authors.popularityScore, bio: authors.biography }).from(authors).where(eq(authors.status, "ready")).orderBy(desc(authors.popularityScore)).limit(limit);
    return rows.map(row=>({...row,bio:row.bio??`${row.name}の代表作と関連作品を紹介します。`}));
  } catch { return []; }
}

export const authorRecord = cache(async (slug: string) => {
  slug = decodeURIComponent(slug);
  if (previewMode()) return catalogAuthorList.find((author) => author.slug === slug);
  if (!isDatabaseConfigured()) return undefined;
  try {
    const row = (await getDb().select({ slug: authors.slug, name: authors.name, kana: authors.normalizedName, popularity: authors.popularityScore, bio: authors.biography }).from(authors).where(eq(authors.slug, slug)).limit(1))[0];
    return row ? { ...row, bio: row.bio ?? `${row.name}の代表作と関連作品を紹介します。` } : undefined;
  } catch { return undefined; }
});