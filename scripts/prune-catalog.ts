import { inArray, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "../src/db/client";
import { authors, works } from "../src/db/schema";
import { rejectReason, type RejectReason } from "../src/lib/content-filter";
import { refreshPopularityAndRanking } from "../src/lib/import-pipeline";

// 既存カタログを現在の掲載基準で点検し、対象外の作品を取り除く。
// 既定は確認のみ(dry run)。実際に削除するには APPLY=true を指定する。
const APPLY = process.env.APPLY === "true";
const SAMPLES_PER_REASON = 15;

type Doomed = { id: string; title: string; reason: RejectReason };

async function main() {
  if (!isDatabaseConfigured()) throw new Error("DATABASE_URL is not configured");
  const db = getDb();

  const rows = await db.select({ id: works.id, title: works.title }).from(works);
  const doomed: Doomed[] = [];
  for (const row of rows) {
    const reason = rejectReason(row.title);
    if (reason) doomed.push({ id: row.id, title: row.title, reason });
  }

  const byReason = new Map<RejectReason, Doomed[]>();
  for (const item of doomed) {
    const list = byReason.get(item.reason) ?? [];
    list.push(item);
    byReason.set(item.reason, list);
  }

  const labels: Record<RejectReason, string> = {
    non_book: "書籍でない資料(目録・索引など)",
    reference: "実用書・教材・年度版",
    adult: "成人向け",
    light_novel: "ライトノベル",
    later_volume: "シリーズ2巻目以降",
  };

  console.log(`mode: ${APPLY ? "APPLY (削除します)" : "DRY RUN (確認のみ・削除しません)"}`);
  console.log(`総作品数: ${rows.length}`);
  console.log(`除外対象: ${doomed.length} (残る作品: ${rows.length - doomed.length})`);
  console.log("");

  for (const [reason, list] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`■ ${labels[reason]}: ${list.length}件`);
    for (const item of list.slice(0, SAMPLES_PER_REASON)) console.log(`    - ${item.title}`);
    if (list.length > SAMPLES_PER_REASON) console.log(`    ... 他 ${list.length - SAMPLES_PER_REASON}件`);
    console.log("");
  }

  if (!APPLY) {
    console.log("削除は行っていません。実際に削除するには APPLY=true を指定して再実行してください。");
    return;
  }
  if (!doomed.length) {
    console.log("削除対象はありません。");
    return;
  }

  // works を消せば edition/著者紐付け/分類/関連本などは外部キーのカスケードで一緒に消える
  let deleted = 0;
  const ids = doomed.map((item) => item.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    await db.delete(works).where(inArray(works.id, chunk));
    deleted += chunk.length;
    console.log(`deleted ${deleted}/${ids.length}`);
  }

  // どの作品とも紐づかなくなった著者を掃除する
  const orphanAuthors = await db.execute(sql`
    delete from authors a
    where not exists (select 1 from work_authors wa where wa.author_id = a.id)
    returning a.id
  `);

  const remaining = await db.select({ count: sql<number>`count(*)::int` }).from(works);
  const remainingAuthors = await db.select({ count: sql<number>`count(*)::int` }).from(authors);
  await refreshPopularityAndRanking();

  console.log("");
  console.log(JSON.stringify({
    deletedWorks: deleted,
    deletedOrphanAuthors: orphanAuthors.rows.length,
    remainingWorks: remaining[0]?.count ?? 0,
    remainingAuthors: remainingAuthors[0]?.count ?? 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
