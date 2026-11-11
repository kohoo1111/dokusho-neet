import Link from "next/link";
import { Search } from "lucide-react";
import { BookGrid } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EmptyState, PageShell } from "@/components/site/PageIntro";
import { searchCatalog } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata("本を検索", "本のタイトルまたは作者名から部分一致で検索できます。", "/books");

const suggestions = ["東野圭吾", "辻村深月", "村上春樹", "伊坂幸太郎", "本屋大賞", "ミステリー"];

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = String(q).trim().slice(0, 120);
  const results = query ? await searchCatalog(query) : [];
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "検索" }]} />
      <header className="mx-auto max-w-2xl pb-10 pt-10 text-center md:pt-16">
        <p className="eyebrow">Search</p>
        <h1 className="display-title mt-4">本を検索</h1>
        <form className="mt-8 flex items-center rounded-full border border-white/15 bg-white/[.07] p-1.5 pl-5 transition focus-within:border-white/45">
          <Search size={18} className="shrink-0 text-white/50" />
          <input name="q" defaultValue={q} autoFocus={!query} aria-label="本のタイトル、作者名またはISBNを検索" placeholder="タイトル・作家名・ISBN" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-white/35" />
          <button className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-white/85">検索</button>
        </form>
        {query ? null : (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map((word) => <Link key={word} href={`/books?q=${encodeURIComponent(word)}`} className="rounded-full border border-white/12 bg-white/[.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/35 hover:text-white">{word}</Link>)}
          </div>
        )}
      </header>
      {query ? (
        <section>
          <p className="mb-7 text-sm text-white/55">「{query}」の検索結果：{results.length}冊</p>
          {results.length ? <BookGrid books={results} /> : <EmptyState title="該当する本が見つかりませんでした" note="別のキーワードや、作家名の一部でもお試しください。" />}
        </section>
      ) : null}
    </PageShell>
  );
}
