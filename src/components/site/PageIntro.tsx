import Link from "next/link";
import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="max-w-3xl pb-8 pt-8 md:pb-12 md:pt-14">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display-title mt-4">{title}</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base md:leading-8">{description}</p>
    </header>
  );
}

/** 一覧ページ共通の外枠。上部にだけ淡い光を置く。 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="aurora min-h-[70vh]">
      <div className="mx-auto max-w-[1600px] px-4 pb-16 md:px-10">{children}</div>
    </div>
  );
}

/** 見出し付きの棚。hrefがあれば「すべて見る」を出す。 */
export function Shelf({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="py-4 md:py-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="rail-title">{title}</h2>
        {href ? <Link href={href} className="shrink-0 text-xs font-semibold text-white/50 transition hover:text-white">すべて見る ›</Link> : null}
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

export function EmptyState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.03] p-10 text-center">
      <p className="font-serif text-xl">{title}</p>
      {note ? <p className="mt-3 text-sm text-white/50">{note}</p> : null}
    </div>
  );
}
