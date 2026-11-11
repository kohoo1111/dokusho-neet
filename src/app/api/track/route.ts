import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/db/client";

// 閲覧・購入クリックの受け口。book_stats（累計）と book_stats_daily（日別）へ加算する。
// 個人を特定する情報は一切保存しない（ISBNと種別のみ）。
const payload = z.object({ event: z.enum(["view", "amazon", "rakuten"]), isbn: z.string().regex(/^\d{13}$/) });
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios/i;
const done = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return done();

  // クローラーや他サイトからの送信は数えない
  const agent = request.headers.get("user-agent") ?? "";
  if (!agent || BOT.test(agent)) return done();
  const origin = request.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== new URL(request.url).host) return done(); } catch { return done(); }
  }

  let data: z.infer<typeof payload>;
  try { data = payload.parse(JSON.parse(await request.text())); } catch { return new Response(null, { status: 400 }); }

  const views = data.event === "view" ? 1 : 0;
  const amazon = data.event === "amazon" ? 1 : 0;
  const rakuten = data.event === "rakuten" ? 1 : 0;

  try {
    const db = getDb();
    await Promise.all([
      // 人気度は「閲覧 + クリック×5」を対数で0〜1に丸めたもの（約1000ポイントで上限）。
      // クリックは購入意欲の強い行動なので閲覧より重く数える。
      db.execute(sql`
        insert into book_stats (work_id, views, clicks_amazon, clicks_rakuten, popularity_score, updated_at)
        select e.work_id, ${views}::int, ${amazon}::int, ${rakuten}::int,
               least(1, ln(1 + ${views}::int + 5 * (${amazon}::int + ${rakuten}::int)) / ln(1000))::real, now()
        from editions e where e.isbn13 = ${data.isbn} limit 1
        on conflict (work_id) do update set
          views = book_stats.views + ${views}::int,
          clicks_amazon = book_stats.clicks_amazon + ${amazon}::int,
          clicks_rakuten = book_stats.clicks_rakuten + ${rakuten}::int,
          popularity_score = least(1, ln(1 + book_stats.views + ${views}::int
            + 5 * (book_stats.clicks_amazon + book_stats.clicks_rakuten + ${amazon}::int + ${rakuten}::int)) / ln(1000))::real,
          updated_at = now()
      `),
      db.execute(sql`
        insert into book_stats_daily (work_id, day, views, clicks_amazon, clicks_rakuten)
        select e.work_id, to_char(now() at time zone 'Asia/Tokyo', 'YYYY-MM-DD'), ${views}::int, ${amazon}::int, ${rakuten}::int
        from editions e where e.isbn13 = ${data.isbn} limit 1
        on conflict (work_id, day) do update set
          views = book_stats_daily.views + ${views}::int,
          clicks_amazon = book_stats_daily.clicks_amazon + ${amazon}::int,
          clicks_rakuten = book_stats_daily.clicks_rakuten + ${rakuten}::int
      `),
    ]);
  } catch {
    // 計測の失敗で利用者の操作を妨げない
  }
  return done();
}
