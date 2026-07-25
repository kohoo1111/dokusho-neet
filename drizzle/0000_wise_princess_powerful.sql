CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "vector";--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'retry', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('draft', 'ready', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."source_provider" AS ENUM('catalog', 'google_books', 'open_library', 'amazon', 'rakuten', 'manual');--> statement-breakpoint
CREATE TABLE "ai_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"model" varchar(120) NOT NULL,
	"prompt_version" varchar(60) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"confidence" real NOT NULL,
	"classification_version" integer NOT NULL,
	"result" jsonb NOT NULL,
	"classified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "author_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(220) NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"biography" text,
	"popularity_score" real DEFAULT 0 NOT NULL,
	"status" "record_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_stats" (
	"work_id" uuid PRIMARY KEY NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"clicks_amazon" bigint DEFAULT 0 NOT NULL,
	"clicks_rakuten" bigint DEFAULT 0 NOT NULL,
	"popularity_score" real DEFAULT 0 NOT NULL,
	"last_shown_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_stats_daily" (
	"work_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks_amazon" integer DEFAULT 0 NOT NULL,
	"clicks_rakuten" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "book_stats_daily_work_id_day_pk" PRIMARY KEY("work_id","day")
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"isbn10" varchar(10),
	"isbn13" varchar(13),
	"publisher_id" uuid,
	"publication_date" varchar(32),
	"format" varchar(40),
	"cover_url" text,
	"amazon_url" text,
	"rakuten_url" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"work_id" uuid,
	"error" text,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(60) NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"cursor" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(120),
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_entries" (
	"snapshot_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"source_score" numeric,
	CONSTRAINT "ranking_entries_snapshot_id_work_id_pk" PRIMARY KEY("snapshot_id","work_id")
);
--> statement-breakpoint
CREATE TABLE "ranking_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "source_provider" NOT NULL,
	"label" text NOT NULL,
	"period" varchar(80),
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "related_books" (
	"work_id" uuid NOT NULL,
	"related_work_id" uuid NOT NULL,
	"score" real NOT NULL,
	"reason" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "related_books_work_id_related_work_id_pk" PRIMARY KEY("work_id","related_work_id")
);
--> statement-breakpoint
CREATE TABLE "source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "source_provider" NOT NULL,
	"external_id" text NOT NULL,
	"edition_id" uuid,
	"payload_hash" varchar(64) NOT NULL,
	"payload" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(80) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_authors" (
	"work_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "work_authors_work_id_author_id_pk" PRIMARY KEY("work_id","author_id")
);
--> statement-breakpoint
CREATE TABLE "work_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"model" varchar(120) NOT NULL,
	"model_version" varchar(60) NOT NULL,
	"dimensions" integer NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"embedded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_tags" (
	"work_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"classification_id" uuid NOT NULL,
	CONSTRAINT "work_tags_work_id_tag_id_classification_id_pk" PRIMARY KEY("work_id","tag_id","classification_id")
);
--> statement-breakpoint
CREATE TABLE "work_themes" (
	"work_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	"classification_id" uuid NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "work_themes_work_id_theme_id_classification_id_pk" PRIMARY KEY("work_id","theme_id","classification_id")
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(220) NOT NULL,
	"title" text NOT NULL,
	"normalized_title" text NOT NULL,
	"original_title" text,
	"synopsis" text,
	"language" varchar(16) DEFAULT 'ja' NOT NULL,
	"status" "record_status" DEFAULT 'draft' NOT NULL,
	"quality_score" real DEFAULT 0 NOT NULL,
	"recommend_score" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_classifications" ADD CONSTRAINT "ai_classifications_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_aliases" ADD CONSTRAINT "author_aliases_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_stats" ADD CONSTRAINT "book_stats_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_stats_daily" ADD CONSTRAINT "book_stats_daily_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_items" ADD CONSTRAINT "import_job_items_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_items" ADD CONSTRAINT "import_job_items_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_snapshot_id_ranking_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."ranking_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_books" ADD CONSTRAINT "related_books_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_books" ADD CONSTRAINT "related_books_related_work_id_works_id_fk" FOREIGN KEY ("related_work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_embeddings" ADD CONSTRAINT "work_embeddings_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_classification_id_ai_classifications_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."ai_classifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_themes" ADD CONSTRAINT "work_themes_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_themes" ADD CONSTRAINT "work_themes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_themes" ADD CONSTRAINT "work_themes_classification_id_ai_classifications_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."ai_classifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_classification_source_uq" ON "ai_classifications" USING btree ("work_id","source_hash","classification_version");--> statement-breakpoint
CREATE INDEX "ai_classification_work_idx" ON "ai_classifications" USING btree ("work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "author_aliases_author_name_uq" ON "author_aliases" USING btree ("author_id","normalized_name");--> statement-breakpoint
CREATE INDEX "author_aliases_name_trgm_idx" ON "author_aliases" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "authors_slug_uq" ON "authors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "authors_name_trgm_idx" ON "authors" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "editions_isbn13_uq" ON "editions" USING btree ("isbn13") WHERE "editions"."isbn13" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "editions_isbn10_uq" ON "editions" USING btree ("isbn10") WHERE "editions"."isbn10" is not null;--> statement-breakpoint
CREATE INDEX "editions_work_idx" ON "editions" USING btree ("work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_job_items_source_uq" ON "import_job_items" USING btree ("job_id","source_key");--> statement-breakpoint
CREATE INDEX "import_job_items_job_idx" ON "import_job_items" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX "import_jobs_claim_idx" ON "import_jobs" USING btree ("status","next_run_at","locked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "publishers_normalized_name_uq" ON "publishers" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_snapshot_rank_uq" ON "ranking_entries" USING btree ("snapshot_id","rank");--> statement-breakpoint
CREATE INDEX "related_books_score_idx" ON "related_books" USING btree ("work_id","score");--> statement-breakpoint
CREATE UNIQUE INDEX "source_records_provider_id_uq" ON "source_records" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "source_records_edition_idx" ON "source_records" USING btree ("edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_uq" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "themes_slug_uq" ON "themes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "work_authors_author_idx" ON "work_authors" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_embedding_source_uq" ON "work_embeddings" USING btree ("work_id","model","source_hash");--> statement-breakpoint
CREATE INDEX "work_embedding_hnsw_idx" ON "work_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "work_tags_tag_idx" ON "work_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "work_themes_theme_idx" ON "work_themes" USING btree ("theme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "works_slug_uq" ON "works" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "works_title_trgm_idx" ON "works" USING gin ("normalized_title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "works_ready_score_idx" ON "works" USING btree ("status","recommend_score");