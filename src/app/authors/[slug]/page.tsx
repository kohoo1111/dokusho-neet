import { notFound } from "next/navigation";
import { AuthorWorkRail } from "@/components/authors/AuthorWorkRail";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro } from "@/components/site/PageIntro";
import { authorRecord, authorWorks } from "@/lib/catalog-repository";
import { coverUrl } from "@/lib/catalog";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  return createMetadata(`${decodeURIComponent(slug)}の代表作`,"作家一覧","/authors/"+slug);
}

export default async function Page({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const author=await authorRecord(slug); if(!author)notFound();
  const books=await authorWorks(slug,20);
  const works=books.map(book=>({id:book.id,title:book.title,image:book.coverImage??coverUrl(book),isbn:book.isbn,rakutenUrl:book.rakutenUrl}));
  return <div className="netflix-page"><div className="mx-auto max-w-[1440px] px-4 pb-20 md:px-8"><Breadcrumbs items={[{label:"作家一覧",href:"/authors"},{label:author.name}]}/><PageIntro eyebrow="Author" title={author.name} description={author.bio}/><section className="overflow-hidden"><h2 className="rail-title mb-4">代表作・人気作品 {works.length}冊</h2>{works.length?<AuthorWorkRail works={works} authorSlug={author.slug} author={author.name}/>:<p className="rounded-2xl border border-dashed border-black/15 p-10 text-center text-sm text-black/50">作品データを準備中です。</p>}</section></div></div>;
}