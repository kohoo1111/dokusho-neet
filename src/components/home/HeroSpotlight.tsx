"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Book } from "@/lib/catalog";
import { coverUrl } from "@/lib/catalog";
import { BookCover } from "@/components/books/BookCover";
import { StoreLinks } from "@/components/books/StoreLinks";

const INTERVAL = 7000;

/** トップの主役。売れ筋の上位を、表紙をぼかした背景とともに順番に見せる。 */
export function HeroSpotlight({ books }: { books: Book[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = books.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), INTERVAL);
    return () => window.clearTimeout(timer);
  }, [index, paused, count]);

  if (!count) {
    return (
      <section className="aurora">
        <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-10 md:py-28">
          <p className="eyebrow">Find your next book</p>
          <h1 className="display-title mt-5">あなたへ、<br />最高の一冊を。</h1>
        </div>
      </section>
    );
  }

  const book = books[index];
  return (
    <section className="relative isolate overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {/* 背景：表紙を大きくぼかして色だけを借りる */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {books.map((item, i) => (
          <Image key={item.isbn || item.id} src={coverUrl(item).replace("http://", "https://")} alt="" fill sizes="200px" priority={i === 0} className={`scale-150 object-cover blur-3xl saturate-150 transition-opacity duration-1000 ${i === index ? "opacity-70" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-night/80 via-night/25 to-transparent" />
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 pb-8 pt-8 md:grid-cols-[1fr_auto] md:items-center md:gap-14 md:px-10 md:pb-12 md:pt-16 lg:pt-20">
        <div className="order-2 min-w-0 md:order-1">
          <h1 className="eyebrow !text-xs">あなたへ、最高の一冊を。</h1>
          <div key={book.isbn || book.id} className="rise">
            <p className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-white/70">
              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white">TOP {index + 1}</span>
              今週の売れ筋ランキング
            </p>
            <h2 className="mt-3 line-clamp-3 font-serif text-[clamp(1.9rem,5.4vw,4.2rem)] font-bold leading-[1.15] tracking-[-.02em]">{book.title}</h2>
            <p className="mt-3 text-sm text-white/65 md:text-base">{book.author}</p>
            {book.synopsis ? <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-7 text-white/60 md:line-clamp-4 md:text-[15px] md:leading-8">{book.synopsis}</p> : null}
            <div className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={`/books/${book.id}`} className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black transition hover:bg-white/85">
                詳しく見る <ArrowRight size={16} />
              </Link>
              <div className="sm:w-[21rem]"><StoreLinks book={book} variant="large" /></div>
            </div>
          </div>
        </div>

        <Link href={`/books/${book.id}`} aria-label={`${book.title}の詳細を見る`} className="order-1 mx-auto block w-[36vw] max-w-[160px] md:order-2 md:w-[230px] md:max-w-none lg:w-[270px]">
          <div key={book.isbn || book.id} className="rise drop-shadow-[0_30px_50px_rgba(0,0,0,.7)] transition duration-500 md:[transform:perspective(1200px)_rotateY(-9deg)] md:hover:[transform:perspective(1200px)_rotateY(0deg)]">
            <BookCover book={book} priority sizes="(max-width: 768px) 42vw, 270px" className="rounded-lg" />
          </div>
        </Link>
      </div>

      {count > 1 ? (
        <div className="mx-auto flex max-w-[1600px] gap-2.5 px-4 pb-8 md:px-10 md:pb-10" role="tablist" aria-label="注目の本を切り替え">
          {books.map((item, i) => (
            <button key={item.isbn || item.id} type="button" role="tab" aria-selected={i === index} aria-label={`${i + 1}位 ${item.title}`} onClick={() => setIndex(i)} className={`group/thumb relative w-11 shrink-0 overflow-hidden rounded transition duration-300 md:w-14 ${i === index ? "opacity-100 ring-2 ring-white" : "opacity-45 hover:opacity-80"}`}>
              <BookCover book={item} sizes="56px" className="rounded-none ring-0" />
              {i === index && !paused ? <span key={`${index}-bar`} className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent" style={{ animation: `progress ${INTERVAL}ms linear both` }} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
