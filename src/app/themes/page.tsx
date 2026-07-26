import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro } from "@/components/site/PageIntro";
import { themes } from "@/lib/catalog";
import { discoveryShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const metadata=createMetadata("テーマ別","ミステリー、恋愛、自己啓発から本を選べます。","/themes");
export const revalidate = 3600;
const tones:Record<string,string>={mystery:"bg-[#a94b2d] text-white",romance:"border border-[#f0d9de] bg-[#fff0f2] text-[#5e2932]","self-help":"border border-[#d8e8f7] bg-[#eef6ff] text-[#24415f]"};
export default async function Page(){const shelves=await Promise.all(themes.map(async(theme)=>({theme,count:(await discoveryShelf({themeSlug:theme.slug,limit:200})).length})));return <div className="mx-auto max-w-[1280px] px-5 md:px-10"><Breadcrumbs items={[{label:"テーマ別"}]}/><PageIntro eyebrow="Browse by mood" title="テーマ別" description="読みたい気持ちはあるけれど、タイトルはまだ決まっていない。そんな日に。"/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shelves.map(({theme,count})=><Link key={theme.slug} href={`/themes/${theme.slug}`} className={`group min-h-64 rounded-3xl p-7 transition hover:-translate-y-1 hover:shadow-xl ${tones[theme.slug]}`}><div className="flex items-start justify-between"><p className="text-xs font-bold tracking-widest">{String(count).padStart(2,"0")} BOOKS</p><ArrowUpRight/></div><h2 className="mt-16 font-serif text-3xl font-semibold">{theme.name}</h2><p className="mt-4 text-sm leading-7 opacity-75">{theme.description}</p></Link>)}</div></div>}