import Link from "next/link";
import { notFound } from "next/navigation";
import { BookGrid } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EmptyState, PageIntro, PageShell } from "@/components/site/PageIntro";
import { awardDefinitions, books } from "@/lib/catalog";
import { awardShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export function generateStaticParams() { return awardDefinitions.map((award) => ({ slug: award.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const award = awardDefinitions.find((item) => item.slug === slug);
  return createMetadata(award ? `${award.name}の受賞作品` : "受賞作品", award?.description, "/awards/" + slug);
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string }> }) {
  const { slug } = await params;
  const { year: yearParam } = await searchParams;
  const award = awardDefinitions.find((item) => item.slug === slug);
  if (!award) notFound();

  const years = [...new Set(books.flatMap((book) => book.awards?.filter((item) => item.name === award.name).map((item) => item.year) ?? []))].sort((a, b) => b - a);
  const year = yearParam ? Number(yearParam) : undefined;
  const items = await awardShelf({ name: award.name, year });
  const chip = (active: boolean) => `shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${active ? "bg-white text-black" : "border border-white/12 bg-white/[.04] text-white/70 hover:border-white/35 hover:text-white"}`;

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "受賞作品", href: "/awards" }, { label: award.name }]} />
      <PageIntro eyebrow={award.category} title={award.name} description={award.description} />
      {years.length ? (
        <div className="book-rail -mx-4 mb-9 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <Link href={`/awards/${slug}`} className={chip(!year)}>すべて</Link>
          {years.map((y) => <Link key={y} href={`/awards/${slug}?year=${y}`} className={chip(year === y)}>{y}年</Link>)}
        </div>
      ) : null}
      {items.length ? <BookGrid books={items} /> : <EmptyState title="作品データを準備中です" note="検証済みの受賞作品から順次追加します。" />}
    </PageShell>
  );
}
