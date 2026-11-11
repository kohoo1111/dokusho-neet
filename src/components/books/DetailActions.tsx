"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { trackViewOnce } from "@/lib/track";
import { StoreLinks, type StoreTarget } from "./StoreLinks";

/** 詳細ページを開いたことを1回だけ記録する。画面には何も描かない。 */
export function ViewTracker({ isbn, title }: { isbn: string; title: string }) {
  useEffect(() => { trackViewOnce({ isbn, title }); }, [isbn, title]);
  return null;
}

/** スマホで常に画面下に出る購入バー。 */
export function MobileBuyBar({ book }: { book: StoreTarget }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-night/90 px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
      <StoreLinks book={book} variant="large" />
    </div>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = { title, text: `${title} | 読書家ニート`, url: window.location.href };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-5 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white">
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {copied ? "リンクをコピーしました" : "この本を共有"}
    </button>
  );
}
