import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dokusho-buta.vercel.app";
export const SITE_NAME = "豚に文庫";
/** 旧サイト名。検索エンジンが同じサイトだと分かるよう構造化データにだけ残す。 */
export const FORMER_SITE_NAME = "読書家ニート";
export const DEFAULT_DESCRIPTION = "ランキング、受賞作品、名作、テーマ、作家から、次に読む一冊と出会える読書案内サイト。";

type MetadataOptions = {
  /** OGP画像。nullを渡すと指定を省き、同じ階層の opengraph-image（動的生成）に任せる。 */
  image?: string | null;
  type?: "website" | "book" | "profile";
};

export function createMetadata(title?: string, description = DEFAULT_DESCRIPTION, path = "/", options: MetadataOptions = {}): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | 次に読む一冊と出会う`;
  const canonical = new URL(path, SITE_URL).toString();
  const image = options.image === undefined ? "/brand-logo.png" : options.image;
  const images = image ? [{ url: image, width: 1200, height: 1200, alt: SITE_NAME }] : undefined;
  return {
    metadataBase: new URL(SITE_URL),
    title: fullTitle,
    description,
    alternates: { canonical },
    icons: { icon: "/icon.png", apple: "/apple-icon.png" },
    openGraph: { title: fullTitle, description, url: canonical, siteName: SITE_NAME, locale: "ja_JP", type: options.type ?? "website", ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title: fullTitle, description, ...(image ? { images: [image] } : {}) },
  };
}

/** 検索結果やSNSの説明文用に、あらすじを1文〜2文の長さへ切り詰める。 */
export function excerpt(text: string | undefined, max = 110) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * 構造化データを <script> に埋め込むための文字列化。
 * 書名やあらすじは外部APIから取り込んだ文字列なので、"</script>" を含んでいてもタグを閉じられないよう < を無害化する。
 */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbJson(items: { name: string; url: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.url, SITE_URL).toString() })) };
}
