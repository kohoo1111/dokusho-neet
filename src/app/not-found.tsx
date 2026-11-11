import Link from "next/link";

export default function NotFound() {
  return (
    <div className="aurora grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="display-title mt-4">ページが見つかりません</h1>
        <p className="mt-5 text-sm leading-7 text-white/60">お探しの本やページは、移動または削除された可能性があります。</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-white/85">ホームへ戻る</Link>
          <Link href="/books" className="rounded-full border border-white/15 bg-white/[.06] px-6 py-3 text-sm font-bold transition hover:bg-white/10">本を検索する</Link>
        </div>
      </div>
    </div>
  );
}
