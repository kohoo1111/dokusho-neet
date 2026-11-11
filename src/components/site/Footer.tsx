import Link from "next/link";

const links = [
  { href: "/ranking", label: "今売れている本" },
  { href: "/awards", label: "受賞作品" },
  { href: "/classics", label: "名作" },
  { href: "/themes", label: "テーマ別" },
  { href: "/authors", label: "作家一覧" },
  { href: "/books", label: "検索" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[.07] bg-surface text-white/55">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-12 md:grid-cols-[1fr_auto] md:px-10 md:py-14">
        <div>
          <p className="font-serif text-xl font-bold text-white">読書家ニート</p>
          <p className="mt-3 max-w-md text-sm leading-7">検索しなくても、次に読む一冊と出会える。静かな本棚を歩くような読書案内。</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm" aria-label="フッターナビゲーション">
          {links.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-white">{link.label}</Link>)}
        </nav>
        {/* アフィリエイト参加の明示。Amazonアソシエイト・楽天アフィリエイトのいずれも規約で掲示を求めている。 */}
        <p className="max-w-2xl text-xs leading-6 text-white/40 md:col-span-2">当サイトは、Amazon.co.jpを含むAmazonアソシエイト・プログラム、および楽天アフィリエイトの参加者です。これらのプログラムにより、各サイトへのリンクによって紹介料を得ることがあります。</p>
        <p className="text-xs text-white/35 md:col-span-2">© 2026 読書家ニート</p>
      </div>
    </footer>
  );
}
