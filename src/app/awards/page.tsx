import { BookRail } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro } from "@/components/site/PageIntro";
import { awardShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const metadata=createMetadata("受賞作品","主要文学賞・ミステリー賞の受賞作品を一覧で紹介します。","/awards");
export const revalidate = 3600;
export default async function Page(){const awarded=await awardShelf({limit:200});return <div className="netflix-page"><div className="mx-auto max-w-[1440px] px-4 md:px-8"><Breadcrumbs items={[{label:"受賞作品"}]}/><PageIntro eyebrow="Award winners" title="受賞作品" description="評価された物語を、賞の垣根を越えて一覧で。作品を開くと受賞年と受賞した賞を確認できます。"/><section className="pb-16"><h2 className="rail-title">受賞作をまとめて見る</h2><BookRail books={awarded}/></section></div></div>}