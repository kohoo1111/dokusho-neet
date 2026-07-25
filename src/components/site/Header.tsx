import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

const nav = [{href:"/ranking",label:"ランキング"},{href:"/awards",label:"受賞作品"},{href:"/classics",label:"名作"},{href:"/themes",label:"テーマ"},{href:"/authors",label:"作家"}];

export function Header() {
  return <header className="sticky top-0 z-50 border-b border-black/[.08] bg-white/95 text-[#171717] backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-5 md:h-[72px] md:px-10">
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="読書家ニート ホーム">
        <Image src="/brand-logo.png" alt="" width={34} height={34} className="h-8 w-8 rounded-full object-cover" priority />
        <span className="font-serif text-[17px] font-semibold tracking-[.06em]">読書家ニート</span>
      </Link>
      <nav className="hidden flex-1 items-center justify-center gap-8 md:flex" aria-label="メインナビゲーション">{nav.map(item=><Link key={item.href} href={item.href} className="text-sm font-medium text-black/60 transition hover:text-black">{item.label}</Link>)}</nav>
      <Link href="/books" className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/[.06]" aria-label="本を検索"><Search size={19}/></Link>
    </div>
    <nav className="book-rail flex gap-6 overflow-x-auto border-t border-black/[.06] px-5 py-3 md:hidden" aria-label="モバイルナビゲーション">{nav.map(item=><Link key={item.href} href={item.href} className="shrink-0 text-xs font-semibold text-black/60">{item.label}</Link>)}</nav>
  </header>;
}