import { importIsbn, refreshPopularityAndRanking } from "../src/lib/import-pipeline";
import { isbn13From } from "../src/lib/text-normalization";

// 国立国会図書館サーチ(NDL Search) SRU API: 無料・無制限・APIキー不要。
// https://ndlsearch.ndl.go.jp/help/api
// NDC(日本十進分類法)と刊行年で候補を絞り込み、そのISBNを既存の取り込みパイプライン(Google Books/楽天/無料分類)に渡す。
const NDL_ENDPOINT = "https://ndlsearch.ndl.go.jp/api/sru";
// 913/914=日本文学(小説・エッセイ), 933/943/953=英米・独・仏文学(翻訳小説), 159=人生訓, 336=経営(自己啓発・ビジネス寄り)
const NDC_CODES = ["913", "914", "933", "943", "953", "159", "336"];
const YEAR_START = 1950;
const YEAR_END = new Date().getFullYear();
const PAGE_SIZE = 200;
// 1クエリあたり大きく深追いしてもNDL側がstartRecordの上限でエラーを返すため、2ページ(最大400件)まで
const MAX_PAGES_PER_BUCKET = 2;

const MAX_IMPORTS = Number(process.env.MAX_IMPORTS_PER_RUN ?? 150);
const MAX_MINUTES = Number(process.env.MAX_MINUTES_PER_RUN ?? 45);

type NdlCandidate = { isbn13: string; title?: string; author?: string };

// 図書館の蔵書目録・索引・年次報告など、読者向けの「本」ではない書誌データを除外する
const NON_BOOK_TITLE_PATTERN = /目録|総目次|索引|便覧|要覧|統計年報|年次報告|白書$/;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function unescapeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

// 新しい本を優先しつつ、名作もある程度混ざるように発行年に重みをつける
const RECENCY_BANDS = [
  { maxAgeYears: 10, weight: 0.7 },
  { maxAgeYears: 30, weight: 0.2 },
  { maxAgeYears: Infinity, weight: 0.1 },
];

function buckets() {
  const all: { ndc: string; year: number }[] = [];
  for (const ndc of NDC_CODES) for (let year = YEAR_START; year <= YEAR_END; year += 1) all.push({ ndc, year });
  const bandPools = RECENCY_BANDS.map(() => [] as { ndc: string; year: number }[]);
  for (const item of all) {
    const age = YEAR_END - item.year;
    const bandIndex = RECENCY_BANDS.findIndex((band) => age <= band.maxAgeYears);
    bandPools[bandIndex].push(item);
  }
  const pools = bandPools.map((pool) => shuffle(pool));

  const result: { ndc: string; year: number }[] = [];
  while (pools.some((pool) => pool.length)) {
    const roll = Math.random();
    let cumulative = 0;
    let chosen = -1;
    for (let i = 0; i < pools.length; i += 1) {
      cumulative += RECENCY_BANDS[i].weight;
      if (roll <= cumulative && pools[i].length) { chosen = i; break; }
    }
    if (chosen === -1) chosen = pools.findIndex((pool) => pool.length);
    result.push(pools[chosen].pop()!);
  }
  return result;
}

async function fetchBucket(ndc: string, year: number): Promise<NdlCandidate[]> {
  const results: NdlCandidate[] = [];
  for (let page = 0; page < MAX_PAGES_PER_BUCKET; page += 1) {
    const startRecord = page * PAGE_SIZE + 1;
    const query = encodeURIComponent(`ndc=${ndc} AND from=${year} AND until=${year}`);
    const url = `${NDL_ENDPOINT}?operation=searchRetrieve&version=1.2&recordSchema=dcndl&maximumRecords=${PAGE_SIZE}&startRecord=${startRecord}&query=${query}`;
    let response: Response;
    try {
      response = await fetch(url, { headers: { "User-Agent": "dokusho-neet-catalog-discovery/1.0" } });
    } catch {
      break;
    }
    if (!response.ok) break;
    const body = await response.text();
    const records = [...body.matchAll(/<recordData>([\s\S]*?)<\/recordData>/g)].map((match) => unescapeXml(match[1]));
    if (!records.length) break;
    for (const record of records) {
      const isbnMatch = record.match(/<dcterms:identifier rdf:datatype="http:\/\/ndl\.go\.jp\/dcndl\/terms\/ISBN">([^<]+)<\/dcterms:identifier>/);
      if (!isbnMatch) continue;
      let isbn13: string;
      try {
        isbn13 = isbn13From(isbnMatch[1]);
      } catch {
        continue;
      }
      const titleMatch = record.match(/<dcterms:title>([^<]*)<\/dcterms:title>/);
      const title = titleMatch?.[1]?.trim();
      if (title && NON_BOOK_TITLE_PATTERN.test(title)) continue;
      const creatorBlock = record.match(/<dcterms:creator>([\s\S]*?)<\/dcterms:creator>/);
      const nameMatch = creatorBlock?.[1].match(/<foaf:name>([^<]*)<\/foaf:name>/);
      const author = nameMatch?.[1].replace(/,\s*\d{4}-?(\d{4})?-?\s*$/, "").replace(/,\s*/, "").trim();
      results.push({ isbn13, title, author: author || undefined });
    }
    if (records.length < PAGE_SIZE) break;
    await sleep(400);
  }
  return results;
}

async function main() {
  const startedAt = Date.now();
  const deadline = startedAt + MAX_MINUTES * 60_000;
  const seenThisRun = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let bucketsSwept = 0;
  const failures: { isbn: string; error: string }[] = [];

  for (const { ndc, year } of buckets()) {
    if (imported >= MAX_IMPORTS || Date.now() > deadline) break;
    const candidates = await fetchBucket(ndc, year);
    bucketsSwept += 1;
    await sleep(500);

    for (const candidate of candidates) {
      if (imported >= MAX_IMPORTS || Date.now() > deadline) break;
      if (seenThisRun.has(candidate.isbn13)) continue;
      seenThisRun.add(candidate.isbn13);
      try {
        const outcome = await importIsbn(candidate.isbn13, { hint: { title: candidate.title, authors: candidate.author ? [candidate.author] : undefined } });
        if (outcome.imported) imported += 1;
        else skipped += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        if (failures.length < 30) failures.push({ isbn: candidate.isbn13, error: message.slice(0, 200) });
      }
    }
  }

  // 取り込んだだけでは著者の人気度・ランキング表に反映されないため、最後にまとめて更新する
  if (imported > 0) await refreshPopularityAndRanking();

  console.log(JSON.stringify({
    imported, skipped, failed, bucketsSwept,
    durationMs: Date.now() - startedAt,
    stoppedReason: imported >= MAX_IMPORTS ? "max_imports_reached" : Date.now() > deadline ? "time_budget_reached" : "buckets_exhausted",
    sampleFailures: failures,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
