import Link from "next/link";
import { BookRail } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EmptyState, PageIntro, PageShell, Shelf } from "@/components/site/PageIntro";
import { awardDefinitions } from "@/lib/catalog";
import { awardShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata("受賞作品", "主要文学賞・ミステリー賞の受賞作品を一覧で紹介します。", "/awards");
export const revalidate = 3600;

export default async function Page() {
  const awarded = await awardShelf({ limit: 200 });
  // 1回の取得結果を賞ごとの棚に分ける（受賞年の新しい順）
  const shelves = awardDefinitions
    .map((award) => ({
      award,
      books: awarded
        .filter((book) => book.awards?.some((item) => item.name === award.name))
        .sort((a, b) => (b.awards?.find((item) => item.name === award.name)?.year ?? 0) - (a.awards?.find((item) => item.name === award.name)?.year ?? 0)),
    }))
    .filter((shelf) => shelf.books.length);

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "受賞作品" }]} />
      <PageIntro eyebrow="Award winners" title="受賞作品" description="評価された物語を、賞ごとの棚で。作品を開くと受賞年と受賞した賞を確認できます。" />
      <nav aria-label="文学賞から選ぶ" className="book-rail -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
        {awardDefinitions.map((award) => <Link key={award.slug} href={`/awards/${award.slug}`} className="shrink-0 rounded-full border border-white/12 bg-white/[.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-gold/60 hover:text-gold">{award.name}</Link>)}
      </nav>
      {shelves.length ? shelves.map(({ award, books }) => (
        <Shelf key={award.slug} title={award.name} href={`/awards/${award.slug}`}><BookRail books={books} label={award.name} /></Shelf>
      )) : <EmptyState title="作品データを準備中です" note="検証済みの受賞作品から順次追加します。" />}
    </PageShell>
  );
}
