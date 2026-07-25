import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { createMetadata, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = createMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  const website = {"@context":"https://schema.org","@type":"WebSite",name:"読書家ニート",url:SITE_URL,potentialAction:{"@type":"SearchAction",target:`${SITE_URL}/books?q={search_term_string}`,"query-input":"required name=search_term_string"}};
  return <html lang="ja"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(website)}}/><Header/><main>{children}</main><Footer/></body></html>;
}