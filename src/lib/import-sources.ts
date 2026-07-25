import { z } from "zod";
import { isbn13From, normalizeIsbn } from "./text-normalization";
import { normalizeCategoryNames, normalizeEditionTitle } from "./normalization-dictionaries";
import { fetchRakutenBookByIsbn } from "./rakuten-books";

export type ImportedEdition = {
  provider: "google_books" | "open_library";
  externalId: string;
  isbn10?: string;
  isbn13: string;
  title: string;
  authors: string[];
  synopsis: string;
  publisher?: string;
  publicationDate?: string;
  categories: string[];
  coverUrl?: string;
  rakutenUrl?: string;
  language?: string;
  raw: unknown;
  searchMethod?: GoogleSearchMethod;
  apiErrorCount?: number;
  seriesName?: string;
  volumeNumber?: number;
  editionLabel?: string;
  supplementSources?: Array<{ provider: "rakuten" | "open_library"; externalId: string; raw: Record<string, unknown> }>;
};

export type GoogleSearchMethod = "isbn" | "title" | "title_author" | "intitle" | "intitle_inauthor" | "without_subtitle" | "normalized" | "without_series";
export class GoogleRetryPendingError extends Error {
  constructor(public readonly status: number, public readonly apiErrorCount: number, message: string) {
    super(message);
    this.name = "GoogleRetryPendingError";
  }
}

const googleSchema = z.object({ items: z.array(z.object({
  id: z.string(),
  volumeInfo: z.object({
    title: z.string(), authors: z.array(z.string()).optional(), description: z.string().optional(), publisher: z.string().optional(),
    publishedDate: z.string().optional(), categories: z.array(z.string()).optional(), language: z.string().optional(),
    imageLinks: z.object({ thumbnail: z.string().optional() }).optional(),
    industryIdentifiers: z.array(z.object({ type: z.string(), identifier: z.string() })).optional(),
  }),
})).optional() });

const googleRequestCache = new Map<string, Promise<GoogleSearchResult>>();
let nextGoogleRequestAt = 0;
let requestErrorCount = 0;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  const exponential = 750 * 2 ** attempt;
  return Math.min(30_000, exponential + Math.random() * Math.min(1_000, exponential * 0.25));
}

async function throttledGoogleFetch(url: string, deadline: number) {
  const minimumInterval = process.env.GOOGLE_BOOKS_API_KEY ? 750 : 1_500;
  const delay = Math.max(0, nextGoogleRequestAt - Date.now());
  if (delay) await wait(Math.min(delay, Math.max(0, deadline - Date.now())));
  nextGoogleRequestAt = Date.now() + minimumInterval;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (Date.now() >= deadline) throw new GoogleRetryPendingError(0, requestErrorCount, "Google Books retry pending: deadline exceeded before request");
    const remaining = deadline - Date.now();
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(Math.max(1_000, Math.min(remaining, 10_000))) });
    } catch {
      requestErrorCount += 1;
      throw new GoogleRetryPendingError(0, requestErrorCount, "Google Books retry pending: request timed out");
    }
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Google Books failed: ${response.status}`);
    }
    requestErrorCount += 1;
    if (attempt === 4) throw new GoogleRetryPendingError(response.status, 5, `Google Books retry pending: HTTP ${response.status}`);
    const nextDelay = retryDelay(response, attempt);
    if (Date.now() + nextDelay >= deadline) throw new GoogleRetryPendingError(response.status, requestErrorCount, "Google Books retry pending: deadline exceeded during backoff");
    await wait(nextDelay);
  }
  throw new Error("Google Books retry loop exhausted");
}

type GoogleSearchResult = { book: ImportedEdition | null; apiErrorCount: number };
type GoogleHint = { isbn: string; title?: string; authors?: string[] };

const compact = (value: string) => value.normalize("NFKC").toLocaleLowerCase("ja").replace(/[\s\p{P}\p{S}]/gu, "");
const normalizeQueryTitle = (value: string) => value.normalize("NFKC").replace(/[-‐-―ーｰ]+/g, "ー").replace(/[\u300e\u300f\u300c\u300d\u3010\u3011()\uff08\uff09"'“”]/g, " ").replace(/\s+/g, " ").trim();
const withoutSubtitle = (value: string) => value.split(/[\uff1a:|\uff5c]/)[0].replace(/[\u300e\u300c].*?[\u300f\u300d]/g, "").trim() || value;
const withoutSeries = (value: string) => value.replace(/\b(?:novel|case\s*file)\b/gi, " ").replace(/#?\s*\d+(?:\.\d+)?/g, " ").replace(/(?:\u4ed8き)?特装版|\u9650定版|\u6587庫版|\u65b0装版|\u5341二国記/gi, " ").replace(/[\u300e\u300c](.*?)[\u300f\u300d]/g, "$1").replace(/\s+/g, " ").trim() || value;
const authorParts = (authors: string[]) => authors.flatMap((value) => value.split(/[\u30fb·、,&/]/)).map(compact).filter((value) => value.length >= 2);

function itemMatches(item: z.infer<typeof googleSchema>["items"] extends (infer T)[] | undefined ? T : never, hint: GoogleHint) {
  const info = item.volumeInfo;
  const identifiers = info.industryIdentifiers?.filter((entry) => entry.type === "ISBN_10" || entry.type === "ISBN_13").map((entry) => normalizeIsbn(entry.identifier)) ?? [];
  if (identifiers.includes(normalizeIsbn(hint.isbn))) return true;
  if (!hint.title) return false;
  const expected = compact(hint.title);
  const actual = compact(info.title);
  const titleMatch = expected === actual || (Math.min(expected.length, actual.length) >= 4 && (expected.includes(actual) || actual.includes(expected)));
  if (!titleMatch) return false;
  const expectedAuthors = authorParts(hint.authors ?? []);
  if (!expectedAuthors.length) return true;
  const actualAuthors = authorParts(info.authors ?? []);
  return expectedAuthors.some((expectedAuthor) => actualAuthors.some((actualAuthor) => expectedAuthor === actualAuthor || expectedAuthor.includes(actualAuthor) || actualAuthor.includes(expectedAuthor)));
}

function toImported(item: NonNullable<z.infer<typeof googleSchema>["items"]>[number], requestedIsbn: string, method: GoogleSearchMethod, apiErrorCount: number): ImportedEdition {
  const identifiers = item.volumeInfo.industryIdentifiers ?? [];
  const isbn13 = identifiers.find((entry) => entry.type === "ISBN_13")?.identifier ?? isbn13From(requestedIsbn);
  const title = normalizeEditionTitle(item.volumeInfo.title);
  return { provider: "google_books", externalId: item.id, isbn10: identifiers.find((entry) => entry.type === "ISBN_10")?.identifier,
    isbn13: normalizeIsbn(isbn13), title: title.displayTitle, authors: item.volumeInfo.authors ?? [], synopsis: item.volumeInfo.description ?? "",
    publisher: item.volumeInfo.publisher, publicationDate: item.volumeInfo.publishedDate, categories: normalizeCategoryNames(item.volumeInfo.categories ?? []), language: item.volumeInfo.language,
    seriesName: title.seriesName, volumeNumber: title.volumeNumber, editionLabel: title.editionLabel,
    coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, "https:"), raw: item, searchMethod: method, apiErrorCount };
}

function searchPlan(hint: GoogleHint): { method: GoogleSearchMethod; query: string }[] {
  const title = hint.title?.trim();
  const author = hint.authors?.[0]?.trim();
  const plan: { method: GoogleSearchMethod; query: string }[] = [{ method: "isbn", query: `isbn:${normalizeIsbn(hint.isbn)}` }];
  if (!title) return plan;
  plan.push({ method: "title", query: title });
  if (author) plan.push({ method: "title_author", query: `${title} ${author}` });
  plan.push({ method: "intitle", query: `intitle:${title}` });
  if (author) plan.push({ method: "intitle_inauthor", query: `intitle:${title} inauthor:${author}` });
  plan.push({ method: "without_subtitle", query: withoutSubtitle(title) });
  plan.push({ method: "normalized", query: normalizeQueryTitle(title) });
  plan.push({ method: "without_series", query: withoutSeries(title) });
  return plan.filter((entry, index, entries) => entries.findIndex((candidate) => compact(candidate.query) === compact(entry.query)) === index);
}

export async function fetchGoogleBookWithFallback(hint: GoogleHint, deadline = Date.now() + 25_000): Promise<GoogleSearchResult> {
  const cacheKey = JSON.stringify([normalizeIsbn(hint.isbn), hint.title ?? "", hint.authors ?? []]);
  const cached = googleRequestCache.get(cacheKey);
  if (cached) return cached;
  const request = (async () => {
    const startErrors = requestErrorCount;
    const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}` : "";
    for (const step of searchPlan(hint)) {
      if (Date.now() >= deadline) break;
      const response = await throttledGoogleFetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(step.query)}&maxResults=40&printType=books${key}`, deadline);
      const items = googleSchema.parse(await response.json()).items ?? [];
      const match = items.find((item) => itemMatches(item, hint));
      if (match) return { book: toImported(match, hint.isbn, step.method, requestErrorCount - startErrors), apiErrorCount: requestErrorCount - startErrors };
    }
    return { book: null, apiErrorCount: requestErrorCount - startErrors };
  })();
  googleRequestCache.set(cacheKey, request);
  try { return await request; } catch (error) { googleRequestCache.delete(cacheKey); throw error; }
}

export async function fetchGoogleBookByIsbn(value: string): Promise<ImportedEdition | null> {
  return (await fetchGoogleBookWithFallback({ isbn: value })).book;
}

const openLibrarySchema = z.record(z.string(), z.object({
  title: z.string().optional(), authors: z.array(z.object({ name: z.string() })).optional(), publishers: z.array(z.object({ name: z.string() })).optional(),
  publish_date: z.string().optional(), subjects: z.array(z.object({ name: z.string() })).optional(), cover: z.object({ large: z.string().optional(), medium: z.string().optional() }).optional(),
}));

export async function fetchOpenLibraryBookByIsbn(value: string): Promise<ImportedEdition | null> {
  const isbn = normalizeIsbn(value);
  const isbn13 = isbn13From(isbn);
  const key = `ISBN:${isbn}`;
  const response = await fetch(`https://openlibrary.org/api/books?bibkeys=${key}&jscmd=data&format=json`, {
    cache: "no-store",
    headers: { "User-Agent": `dokusho-neet/1.0 (${process.env.SITE_URL ?? "https://dokusho-neet.vercel.app"})` },
  });
  if (!response.ok) throw new Error(`Open Library failed: ${response.status}`);
  const raw = openLibrarySchema.parse(await response.json());
  const item = raw[key];
  if (!item?.title) return null;
  return {
    provider: "open_library",
    externalId: isbn,
    isbn10: isbn.length === 10 ? isbn : undefined,
    isbn13,
    title: item.title,
    authors: item.authors?.map(({ name }) => name) ?? [],
    synopsis: "",
    publisher: item.publishers?.[0]?.name,
    publicationDate: item.publish_date,
    categories: item.subjects?.map(({ name }) => name) ?? [],
    coverUrl: item.cover?.large ?? item.cover?.medium,
    raw: item,
  };
}

export async function supplementFromOpenLibrary(book: ImportedEdition, deadline = Date.now() + 15_000): Promise<ImportedEdition> {
  const rakuten = await fetchRakutenBookByIsbn(book.isbn13, deadline);
  const withRakuten: ImportedEdition = rakuten ? {
    ...book,
    synopsis: book.synopsis || rakuten.itemCaption || "",
    publisher: book.publisher ?? rakuten.publisherName,
    publicationDate: book.publicationDate ?? rakuten.salesDate,
    coverUrl: book.coverUrl ?? rakuten.largeImageUrl ?? rakuten.mediumImageUrl ?? rakuten.smallImageUrl,
    rakutenUrl: rakuten.affiliateUrl ?? rakuten.itemUrl,
    seriesName: book.seriesName ?? rakuten.seriesName,
    raw: { google: book.raw, rakuten: rakuten.raw },
    supplementSources: [...(book.supplementSources ?? []), { provider: "rakuten", externalId: book.isbn13, raw: rakuten.raw }],
  } : book;
  if (withRakuten.coverUrl && withRakuten.publisher && withRakuten.synopsis && withRakuten.authors.length) return withRakuten;
  if (Date.now() >= deadline) return withRakuten;
  const key = `ISBN:${withRakuten.isbn13}`;
  let response: Response;
  try {
    response = await fetch(`https://openlibrary.org/api/books?bibkeys=${key}&jscmd=data&format=json`, {
      cache: "no-store", headers: { "User-Agent": `dokusho-neet/1.0 (${process.env.SITE_URL ?? "https://dokusho-neet.vercel.app"})` },
      signal: AbortSignal.timeout(Math.max(1_000, Math.min(deadline - Date.now(), 8_000))),
    });
  } catch {
    return withRakuten;
  }
  if (!response.ok) return withRakuten;
  const raw = openLibrarySchema.parse(await response.json());
  const item = raw[key];
  if (!item) return withRakuten;
  return {
    ...withRakuten,
    title: withRakuten.title || item.title || "",
    authors: withRakuten.authors.length ? withRakuten.authors : item.authors?.map(({ name }) => name) ?? [],
    publisher: withRakuten.publisher ?? item.publishers?.[0]?.name,
    publicationDate: withRakuten.publicationDate ?? item.publish_date,
    categories: normalizeCategoryNames([...withRakuten.categories, ...(item.subjects?.map(({ name }) => name) ?? [])]),
    coverUrl: withRakuten.coverUrl ?? item.cover?.large ?? item.cover?.medium,
    raw: { primary: withRakuten.raw, openLibrary: item },
    supplementSources: [...(withRakuten.supplementSources ?? []), { provider: "open_library", externalId: withRakuten.isbn13, raw: item as Record<string, unknown> }],
  };
}