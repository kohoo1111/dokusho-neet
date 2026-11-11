import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { MobileTabBar } from "@/components/site/MobileTabBar";
import { createMetadata, SITE_URL } from "@/lib/seo";
import "./globals.css";

const sans = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-sans-jp", display: "swap", preload: false });
const serif = Shippori_Mincho({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-serif-jp", display: "swap", preload: false });

export const metadata: Metadata = createMetadata();
export const viewport: Viewport = { themeColor: "#07070a", colorScheme: "dark", viewportFit: "cover" };

// GA4。測定IDが設定されているときだけ読み込む（未設定のローカルやPreviewでは何も送らない）
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: ReactNode }) {
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: "読書家ニート", url: SITE_URL, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/books?q={search_term_string}`, "query-input": "required name=search_term_string" } };
  return (
    <html lang="ja" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
        <Header />
        <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        <Footer />
        <MobileTabBar />
        {GA_ID ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}</Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
