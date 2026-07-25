import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { importJobs, pipelineTasks } from "@/db/schema";
import { importIsbn, refreshDerivedData, refreshRelatedBooks } from "@/lib/import-pipeline";

export type PipelineStage = "import" | "relate" | "aggregate";
const stages: PipelineStage[] = ["import", "relate", "aggregate"];

export async function enqueuePipeline(isbns: string[]) {
  const db = getDb(); const unique = [...new Set(isbns.filter(Boolean))];
  const [job] = await db.insert(importJobs).values({ kind: "catalog_pipeline_free_v1", payload: { requested: unique.length, openAiEnabled: false } }).returning({ id: importJobs.id });
  await db.insert(pipelineTasks).values(unique.map((isbn) => ({ jobId: job.id, stage: "import" as const, sourceKey: isbn }))).onConflictDoNothing();
  return { jobId: job.id, requested: unique.length };
}

async function addNextTask(jobId: string, stage: PipelineStage, sourceKey: string, workId?: string | null) {
  const next = stage === "import" ? "relate" : null;
  if (next) await getDb().insert(pipelineTasks).values({ jobId, stage: next, sourceKey: workId ?? sourceKey, workId: workId ?? undefined }).onConflictDoNothing();
}

function retryable(error: unknown) { return /retry pending|429|503|5\d\d|timeout|fetch|network/i.test(error instanceof Error ? error.message : String(error)); }

export async function processPipelineBatch(jobId: string, stage: PipelineStage, batchSize = 2, retryOnly = false) {
  const db = getDb();
  await db.execute(sql`update import_jobs set status='running',started_at=coalesce(started_at,now()),updated_at=now() where id=${jobId}`);
  const eligibleStatus = retryOnly ? sql`status='retry_pending'` : sql`status in ('pending','retry_pending','failed')`;
  const claimed = await db.execute(sql`with selected as (
    select id from pipeline_tasks where job_id=${jobId} and stage=${stage}::pipeline_stage
      and ${eligibleStatus} and next_run_at<=now() and attempts<20
    order by case status when 'pending' then 0 when 'failed' then 1 else 2 end,created_at
    for update skip locked limit ${Math.max(1, Math.min(5, batchSize))})
    update pipeline_tasks t set status='running',attempts=t.attempts+1,started_at=coalesce(t.started_at,now()),updated_at=now(),error=null
    from selected where t.id=selected.id returning t.*`);
  for (const raw of claimed.rows) {
    const task = raw as { id: string; source_key: string; work_id: string | null; attempts: number };
    try {
      let metrics: Record<string, number | string | boolean | null>; let workId = task.work_id;
      if (stage === "import") { const outcome = await importIsbn(task.source_key, { enrich: false }); workId = outcome.workId; metrics = { imported: outcome.imported ? 1 : 0, skipped: outcome.skipped, searchMethod: outcome.searchMethod, apiErrorCount: outcome.apiErrorCount, durationMs: outcome.durationMs, openAiUsed: false }; }
      else if (stage === "relate") metrics = { related: await refreshRelatedBooks(String(workId)), openAiUsed: false };
      else { const ids = await db.selectDistinct({ workId: pipelineTasks.workId }).from(pipelineTasks).where(and(eq(pipelineTasks.jobId, jobId), eq(pipelineTasks.stage, "relate"))); metrics = await refreshDerivedData(ids.map((row) => row.workId).filter((id): id is string => Boolean(id))); }
      await db.update(pipelineTasks).set({ status: metrics.skipped ? "skipped" : "completed", workId, metrics, completedAt: new Date(), updatedAt: new Date() }).where(eq(pipelineTasks.id, task.id));
      await addNextTask(jobId, stage, task.source_key, workId);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000); const pending = retryable(error);
      const delay = Math.min(30 * 60_000, 60_000 * 2 ** Math.min(task.attempts - 1, 4)) + Math.floor(Math.random() * 15_000);
      await db.update(pipelineTasks).set(pending ? { status: "retry_pending", error: message, metrics: { failureReason: message, apiErrorCount: 5, openAiUsed: false }, nextRunAt: new Date(Date.now() + delay), updatedAt: new Date() } : { status: "failed", error: message, metrics: { failureReason: message, openAiUsed: false }, completedAt: new Date(), updatedAt: new Date() }).where(eq(pipelineTasks.id, task.id));
    }
  }
  const remainingStage = await db.select({ count: sql<number>`count(*)::int` }).from(pipelineTasks).where(and(eq(pipelineTasks.jobId, jobId), eq(pipelineTasks.stage, stage), inArray(pipelineTasks.status, ["pending", "retry_pending", "running"])));
  if (!remainingStage[0]?.count && stage === "relate") await db.insert(pipelineTasks).values({ jobId, stage: "aggregate", sourceKey: "global" }).onConflictDoNothing();
  const pending = await db.select({ count: sql<number>`count(*)::int` }).from(pipelineTasks).where(and(eq(pipelineTasks.jobId, jobId), inArray(pipelineTasks.status, ["pending", "retry_pending", "running"])));
  const failed = await db.select({ count: sql<number>`count(*)::int` }).from(pipelineTasks).where(and(eq(pipelineTasks.jobId, jobId), eq(pipelineTasks.status, "failed")));
  await db.update(importJobs).set(!pending[0]?.count ? { status: failed[0]?.count ? "failed" : "completed", completedAt: new Date(), updatedAt: new Date() } : { status: "running", updatedAt: new Date() }).where(eq(importJobs.id, jobId));
  return pipelineStatus(jobId);
}

export async function processDueRetryPending() {
  const db = getDb();
  const due = await db.execute(sql`select job_id,stage from pipeline_tasks
    where status='retry_pending' and next_run_at<=now() and attempts<20
    order by next_run_at,created_at limit 1`);
  const task = due.rows[0] as { job_id?: string; stage?: PipelineStage } | undefined;
  if (!task?.job_id || task.stage !== "import") return { processed: 0, message: "No due retry_pending imports" };
  const before = await pipelineStatus(task.job_id);
  const after = await processPipelineBatch(task.job_id, "import", 1, true);
  return { processed: 1, jobId: task.job_id, retryPendingBefore: before?.retryPending ?? 0, retryPendingAfter: after?.retryPending ?? 0, status: after?.status ?? "unknown" };
}

export async function resumePipeline(jobId: string, stage?: PipelineStage) {
  const db = getDb();
  await db.update(pipelineTasks).set({ status: "pending", attempts: 0, error: null, completedAt: null, nextRunAt: new Date(), updatedAt: new Date() }).where(and(eq(pipelineTasks.jobId, jobId), stage ? eq(pipelineTasks.stage, stage) : undefined, inArray(pipelineTasks.status, ["failed", "retry_pending"])));
  await db.update(importJobs).set({ status: "queued", completedAt: null, lastError: null, updatedAt: new Date() }).where(eq(importJobs.id, jobId)); return pipelineStatus(jobId);
}

export async function pipelineStatus(jobId: string) {
  const db = getDb(); const job = (await db.select().from(importJobs).where(eq(importJobs.id, jobId)).limit(1))[0]; if (!job) return null;
  const tasks = await db.select().from(pipelineTasks).where(eq(pipelineTasks.jobId, jobId));
  const byStage = Object.fromEntries(stages.map((stage) => { const rows = tasks.filter((task) => task.stage === stage); return [stage, { total: rows.length, pending: rows.filter((r) => r.status === "pending").length, retryPending: rows.filter((r) => r.status === "retry_pending").length, running: rows.filter((r) => r.status === "running").length, completed: rows.filter((r) => r.status === "completed").length, failed: rows.filter((r) => r.status === "failed").length, skipped: rows.filter((r) => r.status === "skipped").length }]; }));
  const finished = tasks.filter((task) => ["completed", "skipped", "failed"].includes(task.status)).length; const metric = (stage: PipelineStage, key: string) => tasks.filter((task) => task.stage === stage).reduce((sum, task) => sum + Number(task.metrics[key] ?? 0), 0);
  const imports = tasks.filter((task) => task.stage === "import" && ["completed", "skipped"].includes(task.status)); const methods: Record<string, number> = {}; for (const task of imports) { const method = String(task.metrics.searchMethod ?? "unknown"); methods[method] = (methods[method] ?? 0) + 1; }
  return { jobId, status: job.status, progress: tasks.length ? Math.round(finished / tasks.length * 1000) / 10 : 0, imported: metric("import", "imported"), related: metric("relate", "related"), rankingUpdated: metric("aggregate", "rankingUpdated"), authorsUpdated: metric("aggregate", "authorsUpdated"), themesUpdated: 0, classified: 0, embedded: 0, openAiUsed: false,
    searchMethodCounts: methods, apiErrors: metric("import", "apiErrorCount"), retryPending: tasks.filter((task) => task.status === "retry_pending").length,
    averageImportMs: imports.length ? Math.round(metric("import", "durationMs") / imports.length) : null, errors: tasks.filter((task) => task.status === "failed").length, running: tasks.filter((task) => task.status === "running").map((task) => ({ stage: task.stage, sourceKey: task.sourceKey })), stages: byStage,
    durationMs: job.startedAt && job.completedAt ? job.completedAt.getTime() - job.startedAt.getTime() : null,
    failures: tasks.filter((task) => task.status === "failed" || task.status === "retry_pending").map((task) => ({ stage: task.stage, sourceKey: task.sourceKey, status: task.status, error: task.error, attempts: task.attempts, nextRunAt: task.nextRunAt })) };
}