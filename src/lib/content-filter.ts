// 掲載対象を「一般読者向けの小説・エッセイ」に保つための判定。
// 発掘時(scripts/discover-and-import.ts)と既存データの点検(scripts/prune-catalog.ts)の
// 両方から使い、判定基準がずれないようにここへ集約する。

export type RejectReason = "non_book" | "reference" | "adult" | "light_novel" | "later_volume";

// 図書館の蔵書目録・索引・年次報告など、読者向けの「本」ではない書誌データ。
// 「目錄」のように旧字体で登録されている資料もあるため、録/錄の両方を見る。
const NON_BOOK_TITLE_PATTERN = /目[録錄]|蔵書|総目次|索引|便覧|要覧|統計年報|年次報告|白書$/;

// 年度版・教材・資格対策・実務書など、読み物ではない本
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

// 成人向け・官能小説。一般向けサイトとして不適切なうえ、広告(AdSense)の掲載ポリシーにも抵触する。
const ADULT_TITLE_PATTERN = new RegExp([
  "淫|艶|痴|媚薬|絶頂|愛欲|情事|情交|肉体関係",
  "官能|エロ|えっち|エッチ|ポルノ|アダルト|性愛|性活",
  "人妻|熟女|美少女.{0,6}(?:調教|奴隷)|調教|奴隷|陵辱|凌辱|寝取",
  "BL小説|ボーイズラブ|ティーンズラブ|オメガバース|インキュバス",
].join("|"), "i");

// ライトノベル・なろう系。タイトルの語彙と、レーベル(叢書)名の両方で判定する。
const LIGHT_NOVEL_TITLE_PATTERN = new RegExp([
  "異世界|転生|転移|生まれ変わっ",
  "無双|チート|ステータス|レベルアップ|ざまぁ|スキル",
  "勇者|魔王|賢者|聖女|冒険者|ダンジョン|を追放|追放され",
  "婚約破棄|悪役令嬢|令嬢|令息|婚約者|側妃|王太子|後宮|聖騎士",
  "(?:てい|され|し|になっ|だっ)た件|ですが何か|ってどういうことですの",
  "もふもふ|スローライフ|ハーレム|ヒロイン扱い|攻略対象",
].join("|"));

const LIGHT_NOVEL_IMPRINT_PATTERN = new RegExp([
  "電撃文庫|ガガガ文庫|MF文庫|スニーカー文庫|ファンタジア文庫|GA文庫|HJ文庫",
  "オーバーラップ文庫|ダッシュエックス文庫|ラノベ文庫|富士見.*文庫|コバルト文庫",
  "カドカワBOOKS|アース・?スター|TOブックス|マイクロマガジン|モンスター文庫",
  "ノベルス?ゼロ|レジーナブックス|ビーズログ文庫|角川ビーンズ|一迅社文庫",
  "MFブックス|GCノベルズ|ヒーロー文庫|Kラノベ|プライムノベルス",
].join("|"), "i");

// シリーズものの2巻目以降。1巻から読み始められないため、発見用のサイトでは表示対象から外す。
const VOLUME_SUFFIX_PATTERNS = [
  /[.．]\s*\[?(\d{1,3})\]?\s*$/,     // 「タイトル. 2」「タイトル. [4]」
  /\s\[(\d{1,3})\]\s*$/,             // 「タイトル [4]」
  /[.．]\s*その\s*(\d{1,3})\s*$/,    // 「タイトル. その6」
  /第\s*(\d{1,3})\s*巻\s*$/,
  /(?:^|\s)(\d{1,3})\s*巻\s*$/,
  // 巻数を示す記号のない末尾の数字は、文庫の整理番号(例:「星の王子さま 562」)との
  // 区別がつかないため2桁までに限る。
  /\s(\d{1,2})\s*$/,
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

export function isLightNovelImprint(label: string) {
  return LIGHT_NOVEL_IMPRINT_PATTERN.test(label);
}

/** 掲載対象外なら理由を返す。掲載してよい場合は null。 */
export function rejectReason(title: string, options: { imprints?: string[] } = {}): RejectReason | null {
  if (NON_BOOK_TITLE_PATTERN.test(title)) return "non_book";
  if (REFERENCE_TITLE_PATTERN.test(title)) return "reference";
  if (ADULT_TITLE_PATTERN.test(title)) return "adult";
  if (LIGHT_NOVEL_TITLE_PATTERN.test(title)) return "light_novel";
  if (laterVolume(title)) return "later_volume";
  if (options.imprints?.some(isLightNovelImprint)) return "light_novel";
  return null;
}

export function isReadableBook(title: string, options: { imprints?: string[] } = {}) {
  return rejectReason(title, options) === null;
}
