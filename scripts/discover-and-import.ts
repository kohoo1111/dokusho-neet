import { importIsbn, refreshPopularityAndRanking } from "../src/lib/import-pipeline";
import { isbn13From } from "../src/lib/text-normalization";

// 国立国会図書館サーチ(NDL Search) SRU API: 無料・無制限・APIキー不要。
// https://ndlsearch.ndl.go.jp/help/api
// NDC(日本十進分類法)と刊行年で候補を絞り込み、そのISBNを既存の取り込みパイプライン(Google Books/楽天/無料分類)に渡す。
const NDL_ENDPOINT = "https://ndlsearch.ndl.go.jp/api/sru";
// 小説を軸にした構成。913/914=日本文学(小説・エッセイ), 933/943/953=英米・独・仏文学(翻訳小説), 159=人生訓(自己啓発)。
// 336(経営)は会計・税務の実務書ばかり集まってしまうため対象から外している。
const NDC_CODES = ["913", "914", "933", "943", "953", "159"];
const YEAR_START = 1950;
const YEAR_END = new Date().getFullYear();
const PAGE_SIZE = 200;
// 1クエリあたり大きく深追いしてもNDL側がstartRecordの上限でエラーを返すため、2ページ(最大400件)まで
const MAX_PAGES_PER_BUCKET = 2;

// Google Books APIの無料枠(1日あたり)は1回の実行で使い切れてしまうため、8回/日の定期実行に配分できる控えめな値にする
const MAX_IMPORTS = Number(process.env.MAX_IMPORTS_PER_RUN ?? 60);
const MAX_MINUTES = Number(process.env.MAX_MINUTES_PER_RUN ?? 45);
// この回数だけ連続してクォータ超過が続いたら、その日はもう望みがないと判断して早期終了する
const QUOTA_EXHAUSTED_STREAK_LIMIT = 8;

type NdlCandidate = { isbn13: string; title?: string; author?: string };

// 図書館の蔵書目録・索引・年次報告など、読者向けの「本」ではない書誌データを除外する
const NON_BOOK_TITLE_PATTERN = /目録|総目次|索引|便覧|要覧|統計年報|年次報告|白書$/;

// 年度版・教材・資格対策・実務書など、読み物ではない本を除外する
const REFERENCE_TITLE_PATTERN = new RegExp([
  "\\d{4}\\s*[-–~〜]?\\s*\\d{0,4}\\s*年(?:度)?版",   // 2021年度版 / 2024年版
  "改訂\\d*版|新版|第\\d+版|全訂",
  "問題集|過去問|予想問題|模試|ドリル|演習|例題",
  "テキスト|参考書|教科書|副読本|ワークブック",
  "検定|資格|試験対策|受験|合格|攻略本",
  "実務|税務|会計|法務|労務|経理|申告|決算書",
  "マニュアル|ハンドブック|手引き?|入門書|独学",
  "事典|辞典|辞書|図鑑|年鑑|白書|統計",
  "レシピ|献立|ガイドブック|地図帳|時刻表",
  "カタログ|作品集|写真集|画集|楽譜",
].join("|"));

// 成人向け・官能小説を除外する。一般向けサイトとして不適切なうえ、広告(AdSense)の掲載ポリシーにも抵触するため。
const ADULT_TITLE_PATTERN = new RegExp([
  "淫|艶|痴|媚薬|絶頂|愛欲|情事|情交|肉体関係",
  "官能|エロ|えっち|エッチ|ポルノ|アダルト|性愛|性活",
  "人妻|熟女|美少女.{0,6}(?:調教|奴隷)|調教|奴隷|陵辱|凌辱|寝取",
  "BL小説|ボーイズラブ|ティーンズラブ|オメガバース|インキュバス",
].join("|"), "i");

// ライトノベル・なろう系を除外する。タイトルの語彙と、レーベル(叢書)名の両方で判定する。
const LIGHT_NOVEL_TITLE_PATTERN = new RegExp([
  "異世界|転生|転移|生まれ変わっ",
  "無双|チート|ステータス|レベルアップ|ざまぁ|スキル",
  "勇者|魔王|賢者|聖女|冒険者|ダンジョン|を追放|追放され",
  "婚約破棄|悪役令嬢|令嬢|令息|婚約者|側妃|王太子|後宮|聖騎士",
  "(?:てい|され|し|になっ|だっ)た件|ですが何か|ってどういうことですの",
  "もふもふ|スローライフ|ハーレム|ヒロイン扱い|攻略対象",
].join("|"));

// シリーズものの2巻目以降。1巻から読み始められないため、発見用のサイトでは表示対象から外す。
const VOLUME_SUFFIX_PATTERNS = [
  /[.．]\s*\[?(\d{1,3})\]?\s*$/,     // 「タイトル. 2」「タイトル. [4]」
  /\s\[(\d{1,3})\]\s*$/,             // 「タイトル [4]」
  /[.．]\s*その\s*(\d{1,3})\s*$/,    // 「タイトル. その6」
  /第\s*(\d{1,3})\s*巻\s*$/,
  /(?:^|\s)(\d{1,3})\s*巻\s*$/,
  /\s(\d{1,3})\s*$/,                 // 「タイトル 3」
];

function laterVolume(title: string) {
  for (const pattern of VOLUME_SUFFIX_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      const volume = Number(match[1]);
      if (Number.isFinite(volume) && volume >= 2) return true;
    }
  }
  return false;
}

const LIGHT_NOVEL_IMPRINT_PATTERN = new RegExp([
  "電撃文庫|ガガガ文庫|MF文庫|スニーカー文庫|ファンタジア文庫|GA文庫|HJ文庫",
  "オーバーラップ文庫|ダッシュエックス文庫|ラノベ文庫|富士見.*文庫|コバルト文庫",
  "カドカワBOOKS|アース・?スター|TOブックス|マイクロマガジン|モンスター文庫",
  "ノベルス?ゼロ|レジーナブックス|ビーズログ文庫|角川ビーンズ|一迅社文庫",
  "MFブックス|GCノベルズ|ヒーロー文庫|Kラノベ|プライムノベルス",
].join("|"), "i");

// NDLの書誌レコードから叢書(レーベル)名を取り出す。例: rdfs:label="講談社文庫"
function seriesLabels(record: string) {
  return [...record.matchAll(/<dcterms:(?:isPartOf|relation)[^>]*rdfs:label="([^"]*)"/g)].map((match) => match[1]);
}

// 読み物として掲載する価値があるかを判定する(小説・エッセイ中心。実用書・ライトノベル・成人向け・続巻は除外)
function isReadableBook(title: string, record: string) {
  if (NON_BOOK_TITLE_PATTERN.test(title)) return false;
  if (REFERENCE_TITLE_PATTERN.test(title)) return false;
  if (ADULT_TITLE_PATTERN.test(title)) return false;
  if (LIGHT_NOVEL_TITLE_PATTERN.test(title)) return false;
  if (laterVolume(title)) return false;
  if (seriesLabels(record).some((label) => LIGHT_NOVEL_IMPRINT_PATTERN.test(label))) return false;
  return true;
}

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
      if (title && !isReadableBook(title, record)) continue;
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
  let quotaStreak = 0;
  let quotaExhausted = false;
  const failures: { isbn: string; error: string }[] = [];

  outer: for (const { ndc, year } of buckets()) {
    if (imported >= MAX_IMPORTS || Date.now() > deadline) break;
    const candidates = await fetchBucket(ndc, year);
    bucketsSwept += 1;
    await sleep(500);

    for (const candidate of candidates) {
      if (imported >= MAX_IMPORTS || Date.now() > deadline) break outer;
      if (seenThisRun.has(candidate.isbn13)) continue;
      seenThisRun.add(candidate.isbn13);
      try {
        const outcome = await importIsbn(candidate.isbn13, { hint: { title: candidate.title, authors: candidate.author ? [candidate.author] : undefined } });
        quotaStreak = 0;
        if (outcome.imported) imported += 1;
        else skipped += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        if (failures.length < 30) failures.push({ isbn: candidate.isbn13, error: message.slice(0, 200) });
        if (/429|retry pending/i.test(message)) {
          quotaStreak += 1;
          if (quotaStreak >= QUOTA_EXHAUSTED_STREAK_LIMIT) { quotaExhausted = true; break outer; }
        } else {
          quotaStreak = 0;
        }
      }
    }
  }

  // 取り込んだだけでは著者の人気度・ランキング表に反映されないため、最後にまとめて更新する
  if (imported > 0) await refreshPopularityAndRanking();

  console.log(JSON.stringify({
    imported, skipped, failed, bucketsSwept,
    durationMs: Date.now() - startedAt,
    stoppedReason: quotaExhausted ? "google_books_quota_exhausted" : imported >= MAX_IMPORTS ? "max_imports_reached" : Date.now() > deadline ? "time_budget_reached" : "buckets_exhausted",
    sampleFailures: failures,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
