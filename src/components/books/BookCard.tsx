"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/catalog";
import { weightedDiscovery } from "@/lib/discovery";
import { BookCover } from "./BookCover";
import { Rail } from "./Rail";
import { StoreLinks } from "./StoreLinks";

type CardProps = {
  book: Book;
  rank?: number;
  priority?: boolean;
  /** hover: PCでカーソルを乗せたときだけ購入ボタンを出す / always: 常に表示 / none: 出さない */
  actions?: "hover" | "always" | "none";
  meta?: boolean;
  sizes?: string;
};

const lift = "transition duration-300 ease-out group-hover/card:-translate-y-1.5";

export function BookCard({ book, rank, priority = false, actions = "hover", meta = true, sizes }: CardProps) {
  return (
    <article className="group/card relative min-w-0">
      <Link href={`/books/${book.id}`} aria-label={`${book.title}（${book.author}）の詳細を見る`} className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-night">
        <div className={`${lift} group-hover/card:shadow-[0_22px_40px_-12px_rgba(0,0,0,.9)]`}>
          <BookCover book={book} priority={priority} sizes={sizes} />
        </div>
        {meta ? (
          <>
            <h3 className="mt-2.5 line-clamp-2 text-[12.5px] font-bold leading-[1.45] text-white/90 md:text-[13px]">{book.title}</h3>
            <p className="mt-1 line-clamp-1 text-[11px] text-white/45">{book.author}</p>
          </>
        ) : null}
      </Link>
      {rank ? (
        <span className={`pointer-events-none absolute -left-1.5 -top-1.5 z-10 grid h-8 min-w-8 place-items-center rounded-full px-2 text-sm font-black shadow-lg ${rank <= 3 ? "bg-gold text-black" : "bg-black/80 text-white ring-1 ring-white/20"}`}>{rank}</span>
      ) : null}
      {actions === "hover" ? (
        // 表紙と同じ位置に重ねる。タッチ端末ではhoverが効かないのでPCだけに出す
        <div className={`pointer-events-none absolute inset-x-0 top-0 hidden aspect-[2/3] items-end md:flex ${lift}`}>
          <div className="w-full rounded-b-md bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 pt-8 opacity-0 transition duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100">
            <StoreLinks book={book} />
          </div>
        </div>
      ) : null}
      {actions === "always" ? <div className="mt-2.5"><StoreLinks book={book} /></div> : null}
    </article>
  );
}

export function BookGrid({ books, ranked = false, actions = "always" }: { books: Book[]; ranked?: boolean; actions?: CardProps["actions"] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 min-[480px]:grid-cols-3 md:grid-cols-4 md:gap-x-5 lg:grid-cols-6 xl:grid-cols-7">
      {books.map((book, index) => <BookCard key={book.isbn || book.id} book={book} rank={ranked ? index + 1 : undefined} actions={actions} priority={index < 6} sizes="(max-width: 480px) 46vw, (max-width: 768px) 31vw, 200px" />)}
    </div>
  );
}

const popularityOf = (book: Book, index: number) =>
  book.amazonRank || book.rakutenRank
    ? Math.max(0.35, 1 - Math.min(book.amazonRank ?? book.rakutenRank ?? 50, 50) / 60)
    : book.featured ? 0.9 : book.awards?.length ? 0.82 : book.classicGroup ? 0.72 : Math.max(0.4, 0.68 - index * 0.006);

/**
 * 横スクロールの本棚。discoveryKey を渡すと、訪問のたびに並びを入れ替えて
 * 毎回ちがう本と出会えるようにする（最近見せた本は出にくくなる）。
 */
export function BookRail({ books, priority = false, discoveryKey, limit = 14, label }: { books: Book[]; priority?: boolean; discoveryKey?: string; limit?: number; label?: string }) {
  const [visible, setVisible] = useState(() => (discoveryKey ? books.slice(0, limit) : books));
  const applied = useRef(false);
  useEffect(() => {
    if (!discoveryKey || applied.current) return;
    applied.current = true;
    setVisible(weightedDiscovery(books, { key: (book) => `${discoveryKey}:${book.isbn}`, popularity: popularityOf, limit }));
  }, [books, discoveryKey, limit]);

  if (!visible.length) return <p className="py-8 text-sm text-white/40">作品データを準備中です。</p>;
  return (
    <Rail label={label}>
      {visible.map((book, index) => (
        <div key={book.isbn || book.id} className="w-[30vw] min-w-[108px] max-w-[150px] shrink-0 snap-start sm:w-[150px] lg:w-[172px] lg:max-w-none">
          <BookCard book={book} priority={priority && index < 6} />
        </div>
      ))}
    </Rail>
  );
}

/** 大きな順位の数字と表紙を並べるTOP10の棚。 */
export function TopRail({ books, label }: { books: Book[]; label?: string }) {
  if (!books.length) return <p className="py-8 text-sm text-white/40">ランキングを準備中です。</p>;
  return (
    <Rail label={label}>
      {books.map((book, index) => (
        <div key={book.isbn || book.id} className="flex shrink-0 snap-start items-end">
          <span aria-hidden="true" className="rank-numeral relative z-0 -mr-2 md:-mr-3">{index + 1}</span>
          <div className="relative z-10 w-[27vw] min-w-[100px] max-w-[132px] sm:w-[132px] lg:w-[150px] lg:max-w-none">
            <BookCard book={book} priority={index < 4} meta={false} />
          </div>
        </div>
      ))}
    </Rail>
  );
}
