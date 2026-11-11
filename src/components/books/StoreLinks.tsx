"use client";

import { ShoppingBag, ShoppingCart } from "lucide-react";
import { amazonUrl, rakutenUrl } from "@/lib/catalog";
import { track } from "@/lib/track";

export type StoreTarget = { isbn: string; title: string; author: string; isbn10?: string; rakutenUrl?: string };

const styles = {
  // 棚やグリッドのカード用。暗い面になじませ、触れたときだけ各ストアの色になる
  compact: {
    base: "inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-full border border-white/15 bg-black/55 px-2 text-[11px] font-bold text-white backdrop-blur transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
    amazon: "hover:border-transparent hover:bg-[#ffa41c] hover:text-black",
    rakuten: "hover:border-transparent hover:bg-[#bf0000]",
    icon: 13,
  },
  // 詳細ページ用の主ボタン
  large: {
    base: "inline-flex h-13 min-w-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    amazon: "bg-[#ffa41c] text-black hover:bg-[#ffb648]",
    rakuten: "bg-[#bf0000] text-white hover:bg-[#d91a1a]",
    icon: 17,
  },
} as const;

export function StoreLinks({ book, variant = "compact" }: { book: StoreTarget; variant?: keyof typeof styles }) {
  const style = styles[variant];
  const large = variant === "large";
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <a href={amazonUrl(book)} target="_blank" rel="sponsored noopener noreferrer" onClick={() => track("amazon", book)} className={`${style.base} ${style.amazon}`}>
        <ShoppingCart size={style.icon} aria-hidden="true" />
        <span className="truncate">{large ? "Amazonで見る" : "Amazon"}</span>
      </a>
      <a href={rakutenUrl(book)} target="_blank" rel="sponsored noopener noreferrer" onClick={() => track("rakuten", book)} className={`${style.base} ${style.rakuten}`}>
        <ShoppingBag size={style.icon} aria-hidden="true" />
        <span className="truncate">{large ? "楽天で見る" : "楽天"}</span>
      </a>
    </div>
  );
}
