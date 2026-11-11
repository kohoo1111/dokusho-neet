"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/catalog";
import { coverUrl } from "@/lib/catalog";

type CoverBook = Pick<Book, "title" | "author" | "isbn" | "coverImage">;

export function BookCover({ book, priority = false, sizes = "(max-width: 640px) 34vw, 180px", className = "" }: { book: CoverBook; priority?: boolean; sizes?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // 画像の読み込み失敗がハイドレーション前に起きると onError を拾えないため、表示後にも確認する
  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md bg-raised ring-1 ring-white/10 ${className}`}>
      {failed ? (
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(150deg,#2a2a33,#15151a)] p-[12%]">
          <span className="text-[9px] font-bold tracking-[.22em] text-white/35">BOOK</span>
          <strong className="line-clamp-4 font-serif text-[clamp(.8rem,2vw,1.15rem)] leading-snug text-white/90">{book.title}</strong>
          <span className="line-clamp-1 text-[10px] text-white/50">{book.author}</span>
        </div>
      ) : (
        <Image
          ref={ref}
          src={coverUrl(book as Book).replace("http://", "https://")}
          alt={`『${book.title}』の表紙`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
