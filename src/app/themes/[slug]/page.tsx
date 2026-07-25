import { notFound } from "next/navigation";
import { BookRail } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro } from "@/components/site/PageIntro";
import { getTheme, themes } from "@/lib/catalog";
import { discoveryShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";
export function generateStaticParams(){return themes.map(t=>({slug:t.slug}))}export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const t=getTheme(slug);return createMetadata(t?`${t.name}の本`:"テーマ別",t?.description,"/themes/"+slug)}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const theme=getTheme(slug);if(!theme)notFound();const items=await discoveryShelf({themeSlug:slug,fallbackTheme:theme.name,limit:20});return <div className="netflix-page"><div className="mx-auto max-w-[1440px] px-4 md:px-8"><Breadcrumbs items={[{label:"テーマ別",href:"/themes"},{label:theme.name}]}/><PageIntro eyebrow="Theme" title={theme.name} description={theme.description}/><section className="pb-12"><h2 className="rail-title">{items.length}冊のおすすめ</h2><BookRail books={items} discoveryKey={`theme:${theme.slug}`} limit={Math.min(20,items.length)}/></section></div></div>}