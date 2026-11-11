import { notFound } from "next/navigation";
import { BookGrid } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EmptyState, PageIntro, PageShell } from "@/components/site/PageIntro";
import { authorRecord, authorWorks } from "@/lib/catalog-repository";
import { createMetadata, excerpt } from "@/lib/seo";

export const revalidate = 3600;
export function generateStaticParams() { return []; }

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const author = await authorRecord(slug);
  if (!author) return createMetadata("作家が見つかりません", undefined, "/authors/" + slug);
  return createMetadata(`${author.name}のおすすめ作品・代表作`, excerpt(`${author.name}の代表作・人気作品を表紙で一覧。${author.bio}`, 120), "/authors/" + slug, { type: "profile" });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const author = await authorRecord(slug);
  if (!author) notFound();
  const works = await authorWorks(slug, 30);
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "作家一覧", href: "/authors" }, { label: author.name }]} />
      <PageIntro eyebrow="Author" title={author.name} description={author.bio} />
      <h2 className="rail-title mb-6">代表作・人気作品 {works.length}冊</h2>
      {works.length ? <BookGrid books={works} /> : <EmptyState title="作品データを準備中です" />}
    </PageShell>
  );
}
