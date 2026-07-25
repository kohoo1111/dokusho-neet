import { BookRail } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro } from "@/components/site/PageIntro";
import { rankingShelf } from "@/lib/catalog-repository";
import { rankingPeriod,rankingSourceUrl } from "@/lib/current-ranking";
import { createMetadata } from "@/lib/seo";

export const metadata=createMetadata("今売れている本 TOP20","公式週間ランキングを順位を変えずに掲載。","/ranking");
export default async function Page(){const ranking=await rankingShelf(20);return <div className="netflix-page"><div className="mx-auto max-w-[1440px] px-4 md:px-8"><Breadcrumbs items={[{label:"ランキング"}]}/><PageIntro eyebrow="Weekly bestseller" title="今売れている本 TOP20" description="大型書店のランキング棚のように、今選ばれている本を横に眺められます。"/><div className="mb-8 flex flex-wrap justify-between gap-2 text-xs text-white/45"><span>集計期間：{rankingPeriod}</span><a href={rankingSourceUrl} target="_blank" rel="noopener noreferrer" className="underline">公式データの出典</a></div><BookRail books={ranking} ranked priority/><p className="pb-20 pt-6 text-xs leading-6 text-white/40">公開された単一の週間順位をそのまま掲載し、根拠のない媒体横断順位は作成していません。</p></div></div>}