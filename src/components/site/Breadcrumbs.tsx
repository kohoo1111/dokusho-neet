import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="パンくずリスト" className="pt-5 text-xs text-white/40">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link href="/" className="transition hover:text-white">ホーム</Link></li>
        {items.map((item) => (
          <li key={item.label} className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true">/</span>
            {item.href ? <Link href={item.href} className="transition hover:text-white">{item.label}</Link> : <span aria-current="page" className="line-clamp-1 text-white/60">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
