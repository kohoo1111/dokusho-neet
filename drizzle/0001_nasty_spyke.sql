CREATE TYPE "public"."pipeline_stage" AS ENUM('import', 'classify', 'embed', 'relate', 'aggregate');--> statement-breakpoint
CREATE TYPE "public"."pipeline_task_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "pipeline_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"stage" "pipeline_stage" NOT NULL,
	"source_key" text NOT NULL,
	"work_id" uuid,
	"status" "pipeline_task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_tasks" ADD CONSTRAINT "pipeline_tasks_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_tasks" ADD CONSTRAINT "pipeline_tasks_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_tasks_job_stage_source_uq" ON "pipeline_tasks" USING btree ("job_id","stage","source_key");--> statement-breakpoint
CREATE INDEX "pipeline_tasks_claim_idx" ON "pipeline_tasks" USING btree ("job_id","stage","status","next_run_at");--> statement-breakpoint
CREATE INDEX "pipeline_tasks_work_idx" ON "pipeline_tasks" USING btree ("work_id","stage");