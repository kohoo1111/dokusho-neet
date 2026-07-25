import Link from "next/link";

export function Footer() {
  return <footer className="mt-24 border-t border-black/[.08] bg-[#f7f7f7] text-[#555]">
    <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 md:grid-cols-[1fr_auto] md:px-10">
      <div><p className="font-serif text-xl text-[#171717]">読書家ニート</p><p className="mt-3 max-w-md text-sm leading-7 text-[#777]">検索しなくても、次に読む一冊と出会える。静かな本棚を歩くような読書案内。</p></div>
      <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm"><Link href="/ranking">今売れている本 TOP20</Link><Link href="/awards">受賞作品</Link><Link href="/classics">名作</Link><Link href="/themes">テーマ別</Link><Link href="/authors">作家一覧</Link></nav>
      <p className="text-xs text-[#77726c] md:col-span-2">© 2026 読書家ニート</p>
    </div>
  </footer>;
}