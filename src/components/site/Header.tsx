import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

const nav = [
  { href: "/ranking", label: "ランキング" },
  { href: "/awards", label: "受賞作品" },
  { href: "/classics", label: "名作" },
  { href: "/themes", label: "テーマ" },
  { href: "/authors", label: "作家" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[.06] bg-night/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-8 px-4 md:h-16 md:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="読書家ニート ホーム">
          <Image src="/brand-logo.png" alt="" width={34} height={34} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/15" priority />
          <span className="font-serif text-[17px] font-bold tracking-[.08em]">読書家ニート</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-7 md:flex" aria-label="メインナビゲーション">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-white/60 transition hover:text-white">{item.label}</Link>
          ))}
        </nav>
        <Link href="/books" className="ml-auto inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white md:border md:border-white/10 md:bg-white/[.05] md:px-4" aria-label="本を検索">
          <Search size={18} />
          <span className="hidden md:inline">作品・作家を検索</span>
        </Link>
      </div>
    </header>
  );
}
