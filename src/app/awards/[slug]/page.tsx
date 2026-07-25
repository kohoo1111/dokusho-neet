import Link from "next/link";
import { notFound } from "next/navigation";
import { BookGrid } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro } from "@/components/site/PageIntro";
import { awardDefinitions, books } from "@/lib/catalog";
import { awardShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export function generateStaticParams(){return awardDefinitions.map(a=>({slug:a.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const a=awardDefinitions.find(x=>x.slug===slug);return createMetadata(a?`${a.name}の受賞作品`:"受賞作品",a?.description,"/awards/"+slug)}
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{year?:string}>}){const {slug}=await params;const {year:yearParam}=await searchParams;const award=awardDefinitions.find(a=>a.slug===slug);if(!award)notFound();const years=[...new Set(books.flatMap(b=>b.awards?.filter(a=>a.name===award.name).map(a=>a.year)??[]))].sort((a,b)=>b-a);const year=yearParam?Number(yearParam):undefined;const items=await awardShelf({name:award.name,year});return <div className="mx-auto max-w-[1280px] px-5 md:px-10"><Breadcrumbs items={[{label:"受賞作品",href:"/awards"},{label:award.name}]}/><PageIntro eyebrow={award.category} title={award.name} description={award.description}/>{years.length?<div className="mb-12 flex flex-wrap gap-2"><Link href={`/awards/${slug}`} className={`rounded-full px-4 py-2 text-xs font-bold ${!year?'bg-[#191816] text-white':'bg-white'}`}>すべて</Link>{years.map(y=><Link key={y} href={`/awards/${slug}?year=${y}`} className={`rounded-full px-4 py-2 text-xs font-bold ${year===y?'bg-[#191816] text-white':'bg-white'}`}>{y}年</Link>)}</div>:null}{items.length?<BookGrid books={items}/>:<div className="rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center"><p className="font-serif text-2xl">作品データを準備中です</p><p className="mt-3 text-sm text-[#777069]">検証済みの受賞作品から順次追加します。</p></div>}</div>}