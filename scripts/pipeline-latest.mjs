import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const jobs = await sql`
  select j.id, j.kind, j.status, j.created_at,
    count(t.id)::int as tasks
  from import_jobs j
  left join pipeline_tasks t on t.job_id=j.id
  where j.kind='catalog_pipeline_v1'
  group by j.id
  order by j.created_at desc
  limit 5
`;
console.log(JSON.stringify(jobs, null, 2));
if (jobs[0]) {
  const stages = await sql`
    select stage, status, count(*)::int as count
    from pipeline_tasks where job_id=${jobs[0].id}
    group by stage, status order by stage, status
  `;
  console.log(JSON.stringify(stages, null, 2));
  const failures = await sql`
    select stage, source_key, attempts, error
    from pipeline_tasks where job_id=${jobs[0].id} and status='failed'
    order by updated_at desc limit 5
  `;
  console.log(JSON.stringify(failures, null, 2));
  const retries = await sql`
    select stage, source_key, attempts, error, next_run_at
    from pipeline_tasks where job_id=${jobs[0].id} and status='pending' and attempts>0
    order by updated_at desc limit 5
  `;
  console.log(JSON.stringify(retries, null, 2));
}