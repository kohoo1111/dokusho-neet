"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import type { Book } from "@/lib/catalog";
import { coverUrl } from "@/lib/catalog";

export function BookCover({ book, priority = false, sizes = "(max-width: 640px) 38vw, 180px" }: { book: Book; priority?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  const mounted = useSyncExternalStore(()=>()=>{},()=>true,()=>false);
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[4px] bg-[#e9e5dc] shadow-[0_18px_38px_rgba(20,18,15,.18)]">
      {!mounted||failed?<div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,#f3eee4,#d8cfc0)] p-[12%] text-[#24201c]"><span className="text-[9px] font-bold tracking-[.22em] opacity-45">BOOK</span><strong className="font-serif text-[clamp(.8rem,2vw,1.25rem)] leading-snug">{book.title}</strong><span className="text-[10px] opacity-60">{book.author}</span></div>:<Image
        src={coverUrl(book)}
        alt={`『${book.title}』の表紙`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        onError={() => setFailed(true)}
      />}
    </div>
  );
}