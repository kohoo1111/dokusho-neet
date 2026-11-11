import { ImageResponse } from "next/og";
import { COVER_HOSTS, coverUrl } from "@/lib/catalog";
import { bookRecord } from "@/lib/catalog-repository";
import { SITE_NAME } from "@/lib/seo";

// SNSで共有されたときのカード画像。表紙・書名・著者名を1枚にまとめる。
export const alt = "本の表紙と書名";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

// 画像生成エンジンは日本語フォントを内蔵していないため、使う文字だけをGoogle Fontsから取得する
async function loadFont(text: string) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(4000) })).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return response.ok ? await response.arrayBuffer() : null;
  } catch { return null; }
}

// 表紙は事前に取得して埋め込む（取得に失敗しても画像生成そのものは続ける）
async function loadCover(url: string) {
  // サーバーから取りに行くのは、許可した画像配信元だけ
  if (!COVER_HOSTS.test(url)) return null;
  try {
    const response = await fetch(url.replace("http://", "https://"), { signal: AbortSignal.timeout(4000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/image\/(jpeg|png)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch { return null; }
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export default async function OpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await bookRecord(id);
  const title = clip(book?.title ?? SITE_NAME, 44);
  const author = clip(book?.author ?? "次に読む一冊と出会う", 30);
  const award = book?.awards?.[0] ? `${book.awards[0].year}年 ${book.awards[0].name}` : "";
  const tagline = "次に読む一冊と出会う";

  const [font, cover] = await Promise.all([
    loadFont(`${title}${author}${award}${SITE_NAME}${tagline}`),
    book ? loadCover(coverUrl(book)) : null,
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: "64px 72px", color: "#fff", fontFamily: "NotoSansJP", background: "linear-gradient(135deg, #1b0d12 0%, #07070a 45%, #0d1024 100%)" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={320} height={480} style={{ width: 320, height: 480, objectFit: "cover", borderRadius: 14, boxShadow: "0 40px 80px rgba(0,0,0,.7)" }} />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {award ? <div style={{ display: "flex", alignSelf: "flex-start", padding: "8px 20px", borderRadius: 999, border: "2px solid rgba(242,198,109,.6)", color: "#f2c66d", fontSize: 26, marginBottom: 28 }}>{award}</div> : null}
            <div style={{ display: "flex", fontSize: title.length > 24 ? 54 : 68, lineHeight: 1.25, letterSpacing: "-0.01em" }}>{title}</div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 34, color: "rgba(255,255,255,.65)" }}>{author}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28 }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: "#ff4655" }} />
            <div style={{ display: "flex" }}>{SITE_NAME}</div>
            <div style={{ display: "flex", color: "rgba(255,255,255,.45)", fontSize: 24 }}>{tagline}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "NotoSansJP", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
