"use client";

import { useState } from "react";
import { BookRail } from "@/components/books/BookCard";
import type { Book } from "@/lib/catalog";

export type RankingShelf={id:string;label:string;description:string;updatedAt:string;sourceUrl:string;books:Book[];mode:"official-api-ready"|"editorial-snapshot"};

export function RankingShowcase({shelves}:{shelves:RankingShelf[]}){
  const [active,setActive]=useState(shelves[0].id);const shelf=shelves.find(s=>s.id===active)??shelves[0];
  return <div><div className="book-rail -mx-5 flex gap-2 overflow-x-auto px-5 pb-3" role="tablist" aria-label="ランキング提供元">{shelves.map(s=><button key={s.id} role="tab" aria-selected={s.id===active} onClick={()=>setActive(s.id)} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition ${s.id===active?'bg-white text-[#171614] shadow-lg':'bg-white/10 text-white/70 hover:bg-white/15'}`}>{s.label}</button>)}</div><div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="max-w-xl text-sm leading-7 text-white/65">{shelf.description}</p><p className="mt-2 text-[11px] text-white/40">更新：{shelf.updatedAt} · {shelf.mode==="official-api-ready"?"公式API接続対応":"編集スナップショット"}</p></div><a href={shelf.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white/70 underline decoration-white/30 underline-offset-4">出典を見る</a></div><div className="mt-6"><BookRail books={shelf.books} ranked priority/></div></div>
}