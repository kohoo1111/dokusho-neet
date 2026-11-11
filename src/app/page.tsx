import Link from "next/link";
import { BarChart3, BookOpen, Heart, PenTool, Search, Trophy } from "lucide-react";
import { AuthorChip } from "@/components/authors/AuthorDirectory";
import { BookRail, TopRail } from "@/components/books/BookCard";
import { Rail } from "@/components/books/Rail";
import { HeroSpotlight } from "@/components/home/HeroSpotlight";
import { Shelf } from "@/components/site/PageIntro";
import { authorDirectory, awardShelf, classicShelf, discoveryShelf, rankingShelf } from "@/lib/catalog-repository";

export const revalidate = 3600;

const categories = [
  { href: "/ranking", label: "ランキング", sub: "いま売れている20冊", icon: BarChart3, tone: "from-[#ff4655]/30" },
  { href: "/awards", label: "受賞作品", sub: "14の文学賞から", icon: Trophy, tone: "from-[#f2c66d]/25" },
  { href: "/classics", label: "名作", sub: "時代を越える本", icon: BookOpen, tone: "from-[#5eead4]/20" },
  { href: "/themes", label: "テーマ", sub: "気分から選ぶ", icon: Heart, tone: "from-[#f472b6]/25" },
  { href: "/authors", label: "作家", sub: "作家から出会う", icon: PenTool, tone: "from-[#818cf8]/25" },
  { href: "/books", label: "検索", sub: "タイトル・作家名で", icon: Search, tone: "from-white/15" },
];

export default async function Home() {
  const [ranking, awarded, mystery, romance, selfHelp, classics, homeAuthors] = await Promise.all([
    rankingShelf(20),
    awardShelf({ limit: 20 }),
    discoveryShelf({ themeSlug: "mystery", fallbackTheme: "ミステリー", limit: 20 }),
    discoveryShelf({ themeSlug: "romance", fallbackTheme: "恋愛", limit: 20 }),
    discoveryShelf({ themeSlug: "self-help", fallbackTheme: "自己啓発", limit: 20 }),
    classicShelf("日本文学", 20),
    authorDirectory(30),
  ]);
  const authors = homeAuthors.filter((author) => /[ぁ-んァ-ヶ一-龠]/.test(author.name)).slice(0, 14);

  return (
    <>
      <HeroSpotlight books={ranking.slice(0, 5)} />

      <div className="mx-auto max-w-[1600px] px-4 md:px-10">
        <nav aria-label="カテゴリー" className="book-rail -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-4 pt-2 md:mx-0 md:grid md:grid-cols-6 md:gap-3 md:overflow-visible md:px-0">
          {categories.map(({ href, label, sub, icon: Icon, tone }) => (
            <Link key={href} href={href} className={`group relative w-36 shrink-0 overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-br ${tone} via-white/[.03] to-white/[.02] p-4 transition duration-300 hover:-translate-y-1 hover:border-white/25 md:w-auto md:p-5`}>
              <Icon size={20} className="text-white/85" />
              <p className="mt-5 text-[15px] font-bold md:text-base">{label}</p>
              <p className="mt-1 text-[11px] text-white/50">{sub}</p>
            </Link>
          ))}
        </nav>

        <Shelf title="今売れている本 TOP10" href="/ranking"><TopRail books={ranking.slice(0, 10)} label="今売れている本 TOP10" /></Shelf>
        <Shelf title="受賞作品" href="/awards"><BookRail books={awarded} label="受賞作品" /></Shelf>
        <Shelf title="ミステリー" href="/themes/mystery"><BookRail books={mystery} discoveryKey="home:mystery" label="ミステリー" /></Shelf>
        <Shelf title="恋愛" href="/themes/romance"><BookRail books={romance} discoveryKey="home:romance" label="恋愛" /></Shelf>
        <Shelf title="読み継がれる名作" href="/classics"><BookRail books={classics} discoveryKey="home:classics" label="読み継がれる名作" /></Shelf>
        <Shelf title="自己啓発" href="/themes/self-help"><BookRail books={selfHelp} discoveryKey="home:self-help" label="自己啓発" /></Shelf>

        {authors.length ? (
          <Shelf title="作家から出会う" href="/authors">
            <Rail label="作家から出会う">
              {authors.map((author) => <div key={author.slug} className="w-[22vw] min-w-[84px] max-w-[112px] shrink-0 snap-start md:w-[112px]"><AuthorChip author={author} /></div>)}
            </Rail>
          </Shelf>
        ) : null}
      </div>
    </>
  );
}
