"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Author } from "@/lib/catalog";

const hues = [350, 18, 42, 160, 200, 228, 262, 300];
const hueOf = (name: string) => hues[[...name].reduce((sum, char) => sum + char.codePointAt(0)!, 0) % hues.length];

/** 作家の顔写真は持っていないので、名前の頭文字を色つきの円で見せる。 */
export function AuthorChip({ author }: { author: Pick<Author, "slug" | "name"> }) {
  const hue = hueOf(author.name);
  return (
    <Link href={`/authors/${author.slug}`} className="group/author flex flex-col items-center gap-3 text-center outline-none">
      <span className="grid aspect-square w-full place-items-center rounded-full font-serif text-[clamp(1.6rem,5vw,2.4rem)] font-bold text-white ring-1 ring-white/10 transition duration-300 group-hover/author:-translate-y-1 group-hover/author:ring-white/40 group-focus-visible/author:ring-2 group-focus-visible/author:ring-accent" style={{ background: `linear-gradient(140deg, hsl(${hue} 55% 34%), hsl(${(hue + 40) % 360} 45% 14%))` }}>
        {[...author.name][0]}
      </span>
      <span className="line-clamp-1 text-xs font-bold text-white/80 transition group-hover/author:text-white md:text-[13px]">{author.name}</span>
    </Link>
  );
}

export function AuthorDirectory({ authors }: { authors: Author[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ja");
    return q ? authors.filter((author) => `${author.name} ${author.kana}`.toLocaleLowerCase("ja").includes(q)) : authors;
  }, [authors, query]);

  return (
    <>
      <label className="flex max-w-xl items-center gap-3 rounded-full border border-white/12 bg-white/[.06] px-5 transition focus-within:border-white/40">
        <Search size={18} className="shrink-0 text-white/50" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="作家名・よみがなで絞り込む" aria-label="作家名で絞り込む" className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/35 md:text-sm" />
      </label>
      <p className="mt-6 text-xs text-white/40">{query.trim() ? `「${query.trim()}」に一致する作家：${results.length}人` : `人気順 ${results.length}人`}</p>
      {results.length ? (
        <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 md:grid-cols-6 md:gap-x-6 lg:grid-cols-8 xl:grid-cols-10">
          {results.map((author) => <AuthorChip key={author.slug} author={author} />)}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/50">一致する作家が見つかりませんでした。</div>
      )}
    </>
  );
}
