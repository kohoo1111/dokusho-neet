import { BookGrid } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EmptyState, PageIntro, PageShell } from "@/components/site/PageIntro";
import { rankingShelf } from "@/lib/catalog-repository";
import { rankingPeriod, rankingSourceUrl } from "@/lib/current-ranking";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata("今売れている本 TOP20", "公式週間ランキングを順位を変えずに掲載。", "/ranking");
export const revalidate = 3600;

export default async function Page() {
  const ranking = await rankingShelf(20);
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "ランキング" }]} />
      <PageIntro eyebrow="Weekly bestseller" title="今売れている本 TOP20" description="大型書店のランキング棚のように、今選ばれている本を順位どおりに並べました。" />
      <div className="mb-8 flex flex-wrap justify-between gap-2 text-xs text-white/45">
        <span>集計期間：{rankingPeriod}</span>
        <a href={rankingSourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 transition hover:text-white">公式データの出典</a>
      </div>
      {ranking.length ? <BookGrid books={ranking} ranked /> : <EmptyState title="ランキングを準備中です" />}
      <p className="pt-10 text-xs leading-6 text-white/40">公開された単一の週間順位をそのまま掲載し、根拠のない媒体横断順位は作成していません。</p>
    </PageShell>
  );
}
