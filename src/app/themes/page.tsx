import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BookRail } from "@/components/books/BookCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro, PageShell, Shelf } from "@/components/site/PageIntro";
import { themes } from "@/lib/catalog";
import { discoveryShelf } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata("テーマ別", "ミステリー、恋愛、自己啓発から本を選べます。", "/themes");
export const revalidate = 3600;

const tones: Record<string, string> = { mystery: "from-[#ff4655]/35", romance: "from-[#f472b6]/35", "self-help": "from-[#60a5fa]/35" };

export default async function Page() {
  const shelves = await Promise.all(themes.map(async (theme) => ({ theme, books: await discoveryShelf({ themeSlug: theme.slug, fallbackTheme: theme.name, limit: 20 }) })));
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "テーマ別" }]} />
      <PageIntro eyebrow="Browse by mood" title="テーマ別" description="読みたい気持ちはあるけれど、タイトルはまだ決まっていない。そんな日に。" />
      <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
        {shelves.map(({ theme }) => (
          <Link key={theme.slug} href={`/themes/${theme.slug}`} className={`group rounded-2xl border border-white/[.08] bg-gradient-to-br ${tones[theme.slug] ?? "from-white/15"} via-white/[.03] to-white/[.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/25`}>
            <div className="flex items-start justify-between">
              <h2 className="font-serif text-2xl font-bold md:text-3xl">{theme.name}</h2>
              <ArrowUpRight className="text-white/50 transition group-hover:text-white" />
            </div>
            <p className="mt-4 text-sm leading-7 text-white/60">{theme.description}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        {shelves.map(({ theme, books }) => (
          <Shelf key={theme.slug} title={theme.name} href={`/themes/${theme.slug}`}><BookRail books={books} discoveryKey={`themes:${theme.slug}`} label={theme.name} /></Shelf>
        ))}
      </div>
    </PageShell>
  );
}
