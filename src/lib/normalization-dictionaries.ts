const publisherAliases = new Map<string, string>([
  ["株式会社新潮社", "新潮社"], ["(株)新潮社", "新潮社"],
  ["株式会社講談社", "講談社"], ["(株)講談社", "講談社"],
  ["株式会社集英社", "集英社"], ["(株)集英社", "集英社"],
  ["株式会社KADOKAWA", "KADOKAWA"], ["角川書店", "KADOKAWA"],
  ["株式会社文藝春秋", "文藝春秋"], ["文芸春秋", "文藝春秋"],
]);

const categoryAliases: Array<[RegExp, string]> = [
  [/ミステリ|推理|探偵|crime|detective|mystery/i, "ミステリー"],
  [/恋愛|ロマンス|love|romance/i, "恋愛"],
  [/自己啓発|人生論|成功法|セルフヘルプ|self[- ]?help/i, "自己啓発"],
  [/小説|fiction|literature/i, "文学・小説"],
  [/ビジネス|経営|business/i, "ビジネス"],
];

export function normalizeTypography(value: string) {
  return value.normalize("NFKC").replace(/[‐‑‒–—―ｰ]/g, "ー").replace(/[\s\u3000]+/g, " ").trim();
}

export function normalizePublisherName(value: string) {
  const normalized = normalizeTypography(value).replace(/^[（(]?株[）)]?式会社?/u, "株式会社");
  return publisherAliases.get(normalized) ?? normalized.replace(/^株式会社/u, "").trim();
}

export function normalizeCategoryNames(values: string[]) {
  const normalized = new Set<string>();
  for (const raw of values) {
    const value = normalizeTypography(raw);
    let matched = false;
    for (const [pattern, category] of categoryAliases) {
      if (pattern.test(value)) { normalized.add(category); matched = true; }
    }
    if (!matched && value) normalized.add(value);
  }
  return [...normalized];
}

export type NormalizedEditionTitle = {
  displayTitle: string;
  baseTitle: string;
  seriesName?: string;
  volumeNumber?: number;
  editionLabel?: string;
};

export function normalizeEditionTitle(input: string): NormalizedEditionTitle {
  const displayTitle = normalizeTypography(input);
  const labels = [...displayTitle.matchAll(/[（(【\[]([^）)】\]]*(?:特装版|限定版|愛蔵版|新装版|文庫版)[^）)】\]]*)[）)】\]]/gu)].map((match) => match[1]);
  const withoutLabel = displayTitle.replace(/[（(【\[][^）)】\]]*(?:特装版|限定版|愛蔵版|新装版|文庫版)[^）)】\]]*[）)】\]]/gu, " ");
  const volume = withoutLabel.match(/(?:第\s*)?(\d{1,3})\s*(?:巻|冊)|(?:^|\s)(\d{1,3})$/u);
  const volumeNumber = volume ? Number(volume[1] ?? volume[2]) : undefined;
  const baseTitle = withoutLabel.replace(/(?:第\s*)?\d{1,3}\s*(?:巻|冊)|(?:^|\s)\d{1,3}$/gu, " ").replace(/\s+/g, " ").trim();
  return { displayTitle, baseTitle: baseTitle || displayTitle, seriesName: volumeNumber ? (baseTitle || displayTitle) : undefined, volumeNumber, editionLabel: labels[0] };
}