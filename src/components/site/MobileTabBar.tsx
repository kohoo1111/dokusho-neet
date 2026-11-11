"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, PenTool, Trophy } from "lucide-react";

const tabs = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/ranking", label: "ランキング", icon: BarChart3 },
  { href: "/awards", label: "受賞作", icon: Trophy },
  { href: "/classics", label: "名作", icon: BookOpen },
  { href: "/authors", label: "作家", icon: PenTool },
];

/** スマホ用の下部タブ。本の詳細ページでは購入バーに場所を譲るため表示しない。 */
export function MobileTabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/books/")) return null;
  return (
    <nav aria-label="モバイルナビゲーション" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[.08] bg-night/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${active ? "text-white" : "text-white/45"}`}>
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} className={active ? "text-accent" : undefined} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
