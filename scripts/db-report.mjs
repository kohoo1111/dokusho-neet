import { performance } from "node:perf_hooks";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const started = performance.now();
const [counts, themes, authors, completeness, pipeline, jobs] = await Promise.all([
  sql`select
    (select count(*)::int from works) as works,
    (select count(*)::int from editions) as editions,
    (select count(*)::int from authors) as authors`,
  sql`select t.name, count(distinct wt.work_id)::int as books from themes t left join work_themes wt on wt.theme_id=t.id group by t.id order by t.name`,
  sql`select count(*) filter (where book_count >= 5)::int as authors_with_five,
    coalesce(min(book_count), 0)::int as minimum_books,
    coalesce(max(book_count), 0)::int as maximum_books
    from (select a.id, count(wa.work_id)::int as book_count from authors a left join work_authors wa on wa.author_id=a.id group by a.id) x`,
  sql`select
    count(*) filter (where e.cover_url is not null)::int as with_cover,
    count(*) filter (where length(coalesce(w.synopsis,'')) > 0)::int as with_synopsis,
    count(*) filter (where exists(select 1 from work_authors wa where wa.work_id=w.id))::int as with_author
    from works w left join editions e on e.work_id=w.id and e.is_primary=true`,
  sql`select
    (select count(*)::int from ai_classifications) as classifications,
    (select count(*)::int from work_embeddings) as embeddings,
    (select count(*)::int from related_books) as related,
    (select count(*)::int from ranking_entries) as ranking_entries,
    (select count(*)::int from works where status='ready') as ready,
    (select count(*)::int from works where status='draft') as draft`,
  sql`select status, count(*)::int as count from import_job_items group by status order by status`,
]);
const dbRoundTripMs = Math.round((performance.now() - started) * 10) / 10;

console.log(JSON.stringify({
  counts: counts[0],
  themes,
  authors: authors[0],
  completeness: completeness[0],
  pipeline: pipeline[0],
  importJobs: jobs,
  dbRoundTripMs,
}, null, 2));