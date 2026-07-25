import { z } from "zod";
import { normalizeIsbn } from "@/lib/text-normalization";

const itemSchema = z.object({
  title: z.string().optional(), author: z.string().optional(), publisherName: z.string().optional(),
  salesDate: z.string().optional(), isbn: z.string().optional(), itemCaption: z.string().optional(),
  largeImageUrl: z.string().optional(), mediumImageUrl: z.string().optional(), smallImageUrl: z.string().optional(),
  seriesName: z.string().optional(), booksGenreId: z.string().optional(), itemUrl: z.string().optional(), affiliateUrl: z.string().optional(),
}).passthrough();
const responseSchema = z.object({ Items: z.array(z.object({ Item: itemSchema })).default([]) });

export type RakutenBookSupplement = z.infer<typeof itemSchema> & { raw: Record<string, unknown> };
const cache = new Map<string, Promise<RakutenBookSupplement | null>>();
let nextRequestAt = 0;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function credentials() {
  return { applicationId: process.env.RAKUTEN_APPLICATION_ID || process.env.RAKUTEN_APP_ID, accessKey: process.env.RAKUTEN_ACCESS_KEY };
}

export function isRakutenBooksConfigured() {
  const value = credentials();
  return Boolean(value.applicationId && value.accessKey);
}

export async function fetchRakutenBookByIsbn(value: string, deadline = Date.now() + 15_000): Promise<RakutenBookSupplement | null> {
  const isbn = normalizeIsbn(value);
  if (!isRakutenBooksConfigured()) return null;
  const existing = cache.get(isbn);
  if (existing) return existing;
  const request = (async () => {
    const auth = credentials();
    const params = new URLSearchParams({ applicationId: auth.applicationId!, accessKey: auth.accessKey!, isbn, format: "json" });
    if (process.env.RAKUTEN_AFFILIATE_ID) params.set("affiliateId", process.env.RAKUTEN_AFFILIATE_ID);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (Date.now() >= deadline) return null;
      const delay = Math.max(0, nextRequestAt - Date.now());
      if (delay) await wait(Math.min(delay, Math.max(0, deadline - Date.now())));
      nextRequestAt = Date.now() + 1_100;
      const remaining = Math.max(1_000, Math.min(deadline - Date.now(), 8_000));
      let response: Response;
      try {
        response = await fetch(`https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params}`, { cache: "no-store", signal: AbortSignal.timeout(remaining) });
      } catch {
        return null;
      }
      if (response.ok) {
        const item = responseSchema.parse(await response.json()).Items[0]?.Item;
        return item ? { ...item, raw: item as Record<string, unknown> } : null;
      }
      if (response.status !== 429 && response.status < 500) return null;
      if (attempt === 4) return null;
      const nextDelay = Math.min(20_000, 700 * 2 ** attempt + Math.random() * 900);
      if (Date.now() + nextDelay >= deadline) return null;
      await wait(nextDelay);
    }
    return null;
  })();
  cache.set(isbn, request);
  try { return await request; } catch { cache.delete(isbn); return null; }
}