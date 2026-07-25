import { createHash } from "node:crypto";
import { z } from "zod";

const resultSchema = z.object({
  themes: z.array(z.enum(["ミステリー", "恋愛", "自己啓発"])).max(3),
  tags: z.array(z.string().min(1).max(24)).max(8),
  confidence: z.number().min(0).max(1),
  contentQuality: z.number().min(0).max(1),
});

export type ClassificationResult = z.infer<typeof resultSchema>;
export const CLASSIFICATION_VERSION = 1;
export const PROMPT_VERSION = "dokusho-neet-v1";

export function classificationSourceHash(input: { title: string; authors: string[]; synopsis?: string | null; publisher?: string | null }) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function classifyBook(input: { title: string; authors: string[]; synopsis?: string | null; publisher?: string | null }) {
  if (process.env.DOKUSHO_ENABLE_OPENAI !== "true") throw new Error("OpenAI pipeline is disabled in Ver1");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for classification");
  const model = process.env.OPENAI_CLASSIFICATION_MODEL ?? "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: "与えられた書誌事実だけを根拠に分類する。作者、出版社、受賞歴などの事実を生成しない。テーマはミステリー・恋愛・自己啓発のみ、複数可。根拠が不足するテーマは付けない。短い日本語タグを最大8件付ける。" },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: { format: { type: "json_schema", name: "classification", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: {
          themes: { type: "array", items: { type: "string", enum: ["ミステリー", "恋愛", "自己啓発"] } },
          tags: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
          contentQuality: { type: "number" },
        }, required: ["themes", "tags", "confidence", "contentQuality"],
      } } },
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string; code?: string } } | null;
    const detail = payload?.error?.message ?? payload?.error?.code ?? "unknown error";
    throw new Error(`Classification failed: ${response.status} ${detail}`);
  }
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const outputText = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
  return { model, result: resultSchema.parse(JSON.parse(outputText ?? "{}")) };
}

export async function createBookEmbedding(input: { title: string; authors: string[]; synopsis?: string | null; themes: string[]; tags: string[] }) {
  if (process.env.DOKUSHO_ENABLE_OPENAI !== "true") throw new Error("OpenAI pipeline is disabled in Ver1");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for embeddings");
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const text = [input.title, input.authors.join(" / "), input.synopsis ?? "", input.themes.join(" / "), input.tags.join(" / ")].filter(Boolean).join("\n");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: text, dimensions: 1536 }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string; code?: string } } | null;
    throw new Error(`Embedding failed: ${response.status} ${payload?.error?.message ?? payload?.error?.code ?? "unknown error"}`);
  }
  const payload = await response.json() as { data?: { embedding: number[] }[] };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding?.length) throw new Error("Embedding response was empty");
  return { model, embedding, sourceHash: createHash("sha256").update(text).digest("hex") };
}