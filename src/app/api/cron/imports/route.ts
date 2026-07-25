import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { popularImportIsbns } from "@/lib/import-candidates";
import { claimImportJob, enqueueIsbnImport, processImportJob } from "@/lib/import-pipeline";
import { processDueRetryPending } from "@/lib/pipeline-orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const retry = await processDueRetryPending();
  if (retry.processed) return NextResponse.json({ kind: "retry_pending", ...retry }, { headers: { "Cache-Control": "private, no-store" } });
  const workerId = `vercel-${crypto.randomUUID()}`;
  let jobId = await claimImportJob(workerId);
  if (!jobId) {
    // キューが空の場合は、ランキング・受賞作・著名作家などの優先候補を毎日補充する
    await enqueueIsbnImport(popularImportIsbns());
    jobId = await claimImportJob(workerId);
  }
  if (!jobId) return NextResponse.json({ processed: 0, message: "No queued jobs" });
  return NextResponse.json({ jobId, ...(await processImportJob(jobId, 25)) });
}