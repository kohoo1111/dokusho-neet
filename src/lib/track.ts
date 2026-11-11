// ブラウザ側の計測。閲覧と購入リンクのクリックを、自前のDB（book_stats）とGA4の両方へ送る。
export type TrackEvent = "view" | "amazon" | "rakuten";

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

export function track(event: TrackEvent, book: { isbn: string; title?: string }) {
  if (typeof window === "undefined") return;
  try {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    gtag?.("event", event === "view" ? "book_view" : "affiliate_click", { store: event, isbn: book.isbn, book_title: book.title ?? "" });
  } catch {}
  // 集計はISBN-13で本を特定する。ISBNの無い本は自前集計の対象外。
  if (!/^\d{13}$/.test(book.isbn)) return;
  const body = JSON.stringify({ event, isbn: book.isbn });
  try {
    // 購入リンクは別タブで開くが、念のためページ遷移中でも届くsendBeaconを優先する
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {}
}

/** 同じ本の閲覧を、同一タブのセッション中は1回だけ数える。 */
export function trackViewOnce(book: { isbn: string; title?: string }) {
  try {
    const key = `dokusho-viewed:${book.isbn}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {}
  track("view", book);
}
