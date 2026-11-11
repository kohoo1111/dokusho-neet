import { BookRail } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro, PageShell, Shelf } from "@/components/site/PageIntro";
import { classicShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata("名作", "時代を越えて読み継がれる名作を紹介。", "/classics");
export const revalidate = 3600;

const groups = [["日本文学", "日本文学"], ["海外文学", "海外文学"], ["テーマ別", "物語で読む名作"]] as const;

export default async function Page() {
  const shelves = await Promise.all(groups.map(async ([key, label]) => ({ key, label, books: await classicShelf(key) })));
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "名作" }]} />
      <PageIntro eyebrow="Timeless books" title="名作" description="読み継がれてきた時間そのものが、作品の魅力を証明しています。" />
      {shelves.map(({ key, label, books }) => (
        <Shelf key={key} title={label}><BookRail books={books} discoveryKey={`classics:${key}`} limit={20} label={label} /></Shelf>
      ))}
    </PageShell>
  );
}
