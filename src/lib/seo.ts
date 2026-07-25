import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dokusho-buta.vercel.app";
export const SITE_NAME = "読書家ニート";
export const DEFAULT_DESCRIPTION = "ランキング、受賞作品、名作、テーマ、作家から、次に読む一冊と出会える読書案内サイト。";

export function createMetadata(title?:string, description=DEFAULT_DESCRIPTION, path="/"):Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | 次に読む一冊と出会う`;
  const canonical = new URL(path,SITE_URL).toString();
  return { metadataBase:new URL(SITE_URL), title:fullTitle, description, alternates:{canonical}, icons:{icon:"/icon.png",apple:"/brand-logo.png"}, openGraph:{title:fullTitle,description,url:canonical,siteName:SITE_NAME,locale:"ja_JP",type:"website",images:[{url:"/brand-logo.png",width:1200,height:1200,alt:SITE_NAME}]}, twitter:{card:"summary_large_image",title:fullTitle,description,images:["/brand-logo.png"]} };
}

export function breadcrumbJson(items:{name:string;url:string}[]) { return {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:new URL(item.url,SITE_URL).toString()}))}; }