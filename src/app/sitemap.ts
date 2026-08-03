import type { MetadataRoute } from "next";
import { awardDefinitions, themes } from "@/lib/catalog";
import { sitemapDirectory } from "@/lib/catalog-repository";
import { SITE_URL } from "@/lib/seo";

// 取り込みは常時走っているため、サイトマップも定期的に作り直す。
// これがないとビルド時点の一覧で固定され、以降に追加した本が検索エンジンに登録されない。
export const revalidate = 3600;

export default async function sitemap():Promise<MetadataRoute.Sitemap> {const directory=await sitemapDirectory();const generatedAt=new Date();const paths=["/","/ranking","/awards","/classics","/themes","/authors","/books",...directory.books.map(slug=>`/books/${slug}`),...themes.map(t=>`/themes/${t.slug}`),...directory.authors.map(slug=>`/authors/${slug}`),...awardDefinitions.map(a=>`/awards/${a.slug}`)];return paths.map((path,index)=>({url:new URL(path,SITE_URL).toString(),lastModified:generatedAt,changeFrequency:index<8?"weekly":"monthly",priority:path==="/"?1:path.startsWith("/books/") ? .8 : .7}))}