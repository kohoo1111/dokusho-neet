import { notFound } from "next/navigation";
import { BookGrid } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EmptyState, PageIntro, PageShell } from "@/components/site/PageIntro";
import { getTheme, themes } from "@/lib/catalog";
import { discoveryShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const revalidate = 3600;
export function generateStaticParams() { return themes.map((theme) => ({ slug: theme.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = getTheme(slug);
  return createMetadata(theme ? `${theme.name}のおすすめ本` : "テーマ別", theme?.description, "/themes/" + slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = getTheme(slug);
  if (!theme) notFound();
  const items = await discoveryShelf({ themeSlug: slug, fallbackTheme: theme.name, limit: 28 });
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "テーマ別", href: "/themes" }, { label: theme.name }]} />
      <PageIntro eyebrow="Theme" title={theme.name} description={theme.description} />
      <h2 className="rail-title mb-6">{items.length}冊のおすすめ</h2>
      {items.length ? <BookGrid books={items} /> : <EmptyState title="作品データを準備中です" />}
    </PageShell>
  );
}
