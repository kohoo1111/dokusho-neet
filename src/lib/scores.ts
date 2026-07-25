export function calculateQualityScore(input: { hasCover: boolean; hasSynopsis: boolean; hasPublisher: boolean; authorCount: number; classificationConfidence: number }) {
  return Math.min(1, (input.hasCover ? .24 : 0) + (input.hasSynopsis ? .3 : 0) + (input.hasPublisher ? .12 : 0) + (input.authorCount ? .14 : 0) + input.classificationConfidence * .2);
}

export function calculateRecommendScore(input: { quality: number; popularity: number; freshness: number; diversity: number }) {
  return Math.max(0, Math.min(1, input.quality * .38 + input.popularity * .32 + input.freshness * .16 + input.diversity * .14));
}

export type WeightedCandidate = { id: string; popularity: number; quality: number; recommend: number; views: number; lastShownAt: Date | null };

export function selectWeighted<T extends WeightedCandidate>(items: T[], limit: number, recentIds: ReadonlySet<string> = new Set()) {
  const now = Date.now();
  return items.map((item) => {
    const ageDays = item.lastShownAt ? Math.max(0, (now - item.lastShownAt.getTime()) / 86_400_000) : 90;
    const recency = Math.min(1.5, .4 + ageDays / 30);
    const exposure = 1 / Math.sqrt(1 + item.views);
    const duplicate = recentIds.has(item.id) ? .15 : 1;
    const base = .15 + item.popularity * .28 + item.quality * .27 + item.recommend * .3;
    const weight = Math.max(.0001, base * recency * exposure * duplicate);
    return { item, key: -Math.log(Math.max(Math.random(), Number.EPSILON)) / weight };
  }).sort((a, b) => a.key - b.key).slice(0, limit).map(({ item }) => item);
}