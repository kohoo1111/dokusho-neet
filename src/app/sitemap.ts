import type { MetadataRoute } from "next";
import { awardDefinitions, themes } from "@/lib/catalog";
import { sitemapDirectory } from "@/lib/catalog-repository";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap():Promise<MetadataRoute.Sitemap> {const directory=await sitemapDirectory();const paths=["/","/ranking","/awards","/classics","/themes","/authors","/books",...directory.books.map(slug=>`/books/${slug}`),...themes.map(t=>`/themes/${t.slug}`),...directory.authors.map(slug=>`/authors/${slug}`),...awardDefinitions.map(a=>`/awards/${a.slug}`)];return paths.map((path,index)=>({url:new URL(path,SITE_URL).toString(),lastModified:new Date("2026-07-18"),changeFrequency:index<8?"weekly":"monthly",priority:path==="/"?1:path.startsWith("/books/") ? .8 : .7}))}