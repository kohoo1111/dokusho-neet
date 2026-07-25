import { relations, sql } from "drizzle-orm";
import { bigint, boolean, customType, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector(1536)",
  toDriver: (value) => `[${value.join(",")}]`,
  fromDriver: (value) => value.slice(1, -1).split(",").map(Number),
});

export const recordStatus = pgEnum("record_status", ["draft", "ready", "rejected", "archived"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "retry", "completed", "failed"]);
export const sourceProvider = pgEnum("source_provider", ["catalog", "google_books", "open_library", "amazon", "rakuten", "manual"]);
export const pipelineStage = pgEnum("pipeline_stage", ["import", "classify", "embed", "relate", "aggregate"]);
export const pipelineTaskStatus = pgEnum("pipeline_task_status", ["pending", "retry_pending", "running", "completed", "failed", "skipped"]);

export const works = pgTable("works", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 220 }).notNull(),
  title: text("title").notNull(),
  normalizedTitle: text("normalized_title").notNull(),
  originalTitle: text("original_title"),
  synopsis: text("synopsis"),
  language: varchar("language", { length: 16 }).default("ja").notNull(),
  status: recordStatus("status").default("draft").notNull(),
  qualityScore: real("quality_score").default(0).notNull(),
  recommendScore: real("recommend_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("works_slug_uq").on(table.slug),
  index("works_title_trgm_idx").using("gin", table.normalizedTitle.asc().op("gin_trgm_ops")),
  index("works_ready_score_idx").on(table.status, table.recommendScore),
]);

export const publishers = pgTable("publishers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
}, (table) => [uniqueIndex("publishers_normalized_name_uq").on(table.normalizedName)]);

export const editions = pgTable("editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  isbn10: varchar("isbn10", { length: 10 }),
  isbn13: varchar("isbn13", { length: 13 }),
  publisherId: uuid("publisher_id").references(() => publishers.id, { onDelete: "set null" }),
  publicationDate: varchar("publication_date", { length: 32 }),
  format: varchar("format", { length: 40 }),
  coverUrl: text("cover_url"),
  amazonUrl: text("amazon_url"),
  rakutenUrl: text("rakuten_url"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("editions_isbn13_uq").on(table.isbn13).where(sql`${table.isbn13} is not null`),
  uniqueIndex("editions_isbn10_uq").on(table.isbn10).where(sql`${table.isbn10} is not null`),
  index("editions_work_idx").on(table.workId),
]);

export const authors = pgTable("authors", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 220 }).notNull(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  biography: text("biography"),
  popularityScore: real("popularity_score").default(0).notNull(),
  status: recordStatus("status").default("ready").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("authors_slug_uq").on(table.slug),
  index("authors_name_trgm_idx").using("gin", table.normalizedName.asc().op("gin_trgm_ops")),
]);

export const authorAliases = pgTable("author_aliases", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
}, (table) => [
  uniqueIndex("author_aliases_author_name_uq").on(table.authorId, table.normalizedName),
  index("author_aliases_name_trgm_idx").using("gin", table.normalizedName.asc().op("gin_trgm_ops")),
]);

export const workAuthors = pgTable("work_authors", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  position: integer("position").default(0).notNull(),
}, (table) => [primaryKey({ columns: [table.workId, table.authorId] }), index("work_authors_author_idx").on(table.authorId)]);

export const themes = pgTable("themes", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
}, (table) => [uniqueIndex("themes_slug_uq").on(table.slug)]);

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
}, (table) => [uniqueIndex("tags_slug_uq").on(table.slug)]);

export const aiClassifications = pgTable("ai_classifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 120 }).notNull(),
  promptVersion: varchar("prompt_version", { length: 60 }).notNull(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull(),
  confidence: real("confidence").notNull(),
  classificationVersion: integer("classification_version").notNull(),
  result: jsonb("result").$type<{ themes: string[]; tags: string[]; contentQuality: number }>().notNull(),
  classifiedAt: timestamp("classified_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("ai_classification_source_uq").on(table.workId, table.sourceHash, table.classificationVersion),
  index("ai_classification_work_idx").on(table.workId),
]);

export const workThemes = pgTable("work_themes", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  themeId: uuid("theme_id").notNull().references(() => themes.id, { onDelete: "cascade" }),
  classificationId: uuid("classification_id").notNull().references(() => aiClassifications.id, { onDelete: "cascade" }),
  confidence: real("confidence").notNull(),
}, (table) => [primaryKey({ columns: [table.workId, table.themeId, table.classificationId] }), index("work_themes_theme_idx").on(table.themeId)]);

export const workTags = pgTable("work_tags", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  classificationId: uuid("classification_id").notNull().references(() => aiClassifications.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.workId, table.tagId, table.classificationId] }), index("work_tags_tag_idx").on(table.tagId)]);

export const workEmbeddings = pgTable("work_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 120 }).notNull(),
  modelVersion: varchar("model_version", { length: 60 }).notNull(),
  dimensions: integer("dimensions").notNull(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull(),
  embedding: vector("embedding").notNull(),
  embeddedAt: timestamp("embedded_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("work_embedding_source_uq").on(table.workId, table.model, table.sourceHash),
  index("work_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

export const relatedBooks = pgTable("related_books", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  relatedWorkId: uuid("related_work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  score: real("score").notNull(),
  reason: jsonb("reason").$type<{ vector: number; themes: number; tags: number; author: number; popularity: number }>().notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.workId, table.relatedWorkId] }), index("related_books_score_idx").on(table.workId, table.score)]);

export const rankingSnapshots = pgTable("ranking_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: sourceProvider("source").notNull(),
  label: text("label").notNull(),
  period: varchar("period", { length: 80 }),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rankingEntries = pgTable("ranking_entries", {
  snapshotId: uuid("snapshot_id").notNull().references(() => rankingSnapshots.id, { onDelete: "cascade" }),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  sourceScore: numeric("source_score"),
}, (table) => [primaryKey({ columns: [table.snapshotId, table.workId] }), uniqueIndex("ranking_snapshot_rank_uq").on(table.snapshotId, table.rank)]);

export const sourceRecords = pgTable("source_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: sourceProvider("provider").notNull(),
  externalId: text("external_id").notNull(),
  editionId: uuid("edition_id").references(() => editions.id, { onDelete: "set null" }),
  payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
  payload: jsonb("payload"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("source_records_provider_id_uq").on(table.provider, table.externalId), index("source_records_edition_idx").on(table.editionId)]);

export const importJobs = pgTable("import_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: varchar("kind", { length: 60 }).notNull(),
  status: jobStatus("status").default("queued").notNull(),
  cursor: text("cursor"),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(5).notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: varchar("locked_by", { length: 120 }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).defaultNow().notNull(),
  lastError: text("last_error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("import_jobs_claim_idx").on(table.status, table.nextRunAt, table.lockedAt)]);

export const importJobItems = pgTable("import_job_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").notNull().references(() => importJobs.id, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(),
  status: jobStatus("status").default("queued").notNull(),
  workId: uuid("work_id").references(() => works.id, { onDelete: "set null" }),
  error: text("error"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [uniqueIndex("import_job_items_source_uq").on(table.jobId, table.sourceKey), index("import_job_items_job_idx").on(table.jobId, table.status)]);

export const pipelineTasks = pgTable("pipeline_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").notNull().references(() => importJobs.id, { onDelete: "cascade" }),
  stage: pipelineStage("stage").notNull(),
  sourceKey: text("source_key").notNull(),
  workId: uuid("work_id").references(() => works.id, { onDelete: "cascade" }),
  status: pipelineTaskStatus("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  error: text("error"),
  metrics: jsonb("metrics").$type<Record<string, number | string | boolean | null>>().default({}).notNull(),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("pipeline_tasks_job_stage_source_uq").on(table.jobId, table.stage, table.sourceKey),
  index("pipeline_tasks_claim_idx").on(table.jobId, table.stage, table.status, table.nextRunAt),
  index("pipeline_tasks_work_idx").on(table.workId, table.stage),
]);

export const bookStats = pgTable("book_stats", {
  workId: uuid("work_id").primaryKey().references(() => works.id, { onDelete: "cascade" }),
  views: bigint("views", { mode: "number" }).default(0).notNull(),
  clicksAmazon: bigint("clicks_amazon", { mode: "number" }).default(0).notNull(),
  clicksRakuten: bigint("clicks_rakuten", { mode: "number" }).default(0).notNull(),
  popularityScore: real("popularity_score").default(0).notNull(),
  lastShownAt: timestamp("last_shown_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bookStatsDaily = pgTable("book_stats_daily", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  day: varchar("day", { length: 10 }).notNull(),
  views: integer("views").default(0).notNull(),
  clicksAmazon: integer("clicks_amazon").default(0).notNull(),
  clicksRakuten: integer("clicks_rakuten").default(0).notNull(),
}, (table) => [primaryKey({ columns: [table.workId, table.day] })]);

export const worksRelations = relations(works, ({ many }) => ({ editions: many(editions), authors: many(workAuthors), themes: many(workThemes), tags: many(workTags) }));
export const editionsRelations = relations(editions, ({ one }) => ({ work: one(works, { fields: [editions.workId], references: [works.id] }) }));