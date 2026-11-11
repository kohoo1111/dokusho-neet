import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookRail } from "@/components/books/BookCard";
import { BookCover } from "@/components/books/BookCover";
import { MobileBuyBar, ShareButton, ViewTracker } from "@/components/books/DetailActions";
import { StoreLinks } from "@/components/books/StoreLinks";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Shelf } from "@/components/site/PageIntro";
import { amazonUrl, coverUrl, publisherName, rakutenUrl } from "@/lib/catalog";
import { authorWorks, bookRecord, relatedWorkShelf } from "@/lib/catalog-repository";
import { breadcrumbJson, createMetadata, excerpt, jsonLd, SITE_URL } from "@/lib/seo";

// 本の情報はめったに変わらないので、初回アクセス時に生成して1時間キャッシュする
export const revalidate = 3600;
export function generateStaticParams() { return []; }

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const book = await bookRecord(id);
  if (!book) return createMetadata("本が見つかりません", undefined, "/books/" + id);
  const awards = book.awards?.length ? `${book.awards.map((award) => award.name).join("・")}受賞。` : "";
  const description = excerpt(`${awards}${book.synopsis || `${book.author}『${book.title}』のあらすじ・受賞歴・購入先を紹介します。`}`, 120);
  // OGP画像は同じ階層の opengraph-image.tsx が表紙入りで生成する
  return createMetadata(`${book.title}（${book.author}）のあらすじ・受賞歴`, description, "/books/" + id, { image: null, type: "book" });
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const book = await bookRecord(id);
  if (!book) notFound();

  const [related, sameAuthor] = await Promise.all([
    book.databaseId ? relatedWorkShelf(book.databaseId, 12) : [],
    book.authorSlug ? authorWorks(book.authorSlug, 12) : [],
  ]);
  const otherWorks = sameAuthor.filter((item) => item.id !== book.id);
  const publisher = book.publisher ?? publisherName(book);
  const cover = coverUrl(book).replace("http://", "https://");

  const crumbs = breadcrumbJson([{ name: "ホーム", url: "/" }, { name: book.author, url: `/authors/${book.authorSlug}` }, { name: book.title, url: `/books/${book.id}` }]);
  const product = {
    "@context": "https://schema.org", "@type": "Book", name: book.title, author: { "@type": "Person", name: book.author },
    ...(book.isbn ? { isbn: book.isbn } : {}), image: cover, ...(book.synopsis ? { description: book.synopsis } : {}),
    url: `${SITE_URL}/books/${book.id}`, publisher: { "@type": "Organization", name: publisher }, sameAs: [amazonUrl(book), rakutenUrl(book)],
    ...(book.awards?.length ? { award: book.awards.map((award) => `${award.year}年 ${award.name}`) } : {}),
  };

  return (
    <div className="relative isolate">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([crumbs, product]) }} />
      <ViewTracker isbn={book.isbn} title={book.title} />

      {/* 背景：表紙をぼかして、その本の色でページを染める */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[38rem] overflow-hidden">
        <Image src={cover} alt="" fill sizes="200px" className="scale-150 object-cover opacity-45 blur-3xl saturate-150" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/40 via-night/75 to-night" />
      </div>

      <div className="mx-auto max-w-[1280px] px-4 pb-28 md:px-10 md:pb-16">
        <Breadcrumbs items={[{ label: book.author, href: `/authors/${book.authorSlug}` }, { label: book.title }]} />

        <section className="grid gap-8 pt-8 md:grid-cols-[260px_1fr] md:gap-14 md:pt-14 lg:grid-cols-[320px_1fr]">
          <div className="mx-auto w-[58vw] max-w-[250px] md:w-full md:max-w-none">
            <div className="drop-shadow-[0_30px_50px_rgba(0,0,0,.75)]">
              <BookCover book={book} priority sizes="(max-width: 768px) 58vw, 320px" className="rounded-lg" />
            </div>
          </div>

          <div className="min-w-0">
            {book.awards?.length ? (
              <ul className="mb-4 flex flex-wrap gap-2">
                {book.awards.map((award) => <li key={award.name + award.year} className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold">{award.year}年 {award.name}</li>)}
              </ul>
            ) : null}
            <h1 className="font-serif text-[clamp(1.9rem,5.2vw,3.8rem)] font-bold leading-[1.18] tracking-[-.02em]">{book.title}</h1>
            <Link href={`/authors/${book.authorSlug}`} className="mt-4 inline-block text-base text-white/65 underline decoration-white/20 underline-offset-4 transition hover:text-white md:text-lg">{book.author}</Link>

            <div className="mt-7 hidden max-w-md md:block"><StoreLinks book={book} variant="large" /></div>

            <div className="mt-8 border-t border-white/10 pt-7">
              <h2 className="text-xs font-bold tracking-[.2em] text-white/40">あらすじ</h2>
              <p className="mt-3 max-w-2xl whitespace-pre-line text-[15px] leading-8 text-white/75">{book.synopsis || "この本のあらすじは準備中です。購入先のページで内容紹介をご確認ください。"}</p>
            </div>

            <dl className="mt-7 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-7 text-sm">
              <div><dt className="text-xs font-bold tracking-[.2em] text-white/40">著者</dt><dd className="mt-2 text-white/80">{book.author}</dd></div>
              <div><dt className="text-xs font-bold tracking-[.2em] text-white/40">出版社</dt><dd className="mt-2 text-white/80">{publisher}</dd></div>
              {book.isbn ? <div><dt className="text-xs font-bold tracking-[.2em] text-white/40">ISBN</dt><dd className="mt-2 text-white/80">{book.isbn}</dd></div> : null}
            </dl>

            <div className="mt-7"><ShareButton title={`${book.title}（${book.author}）`} /></div>
          </div>
        </section>

        <div className="mt-12 md:mt-16">
          {related.length ? <Shelf title="この本を選んだあなたへ"><BookRail books={related} discoveryKey={`related:${book.isbn}`} limit={12} label="この本を選んだあなたへ" /></Shelf> : null}
          {otherWorks.length ? <Shelf title={`${book.author}のほかの作品`} href={`/authors/${book.authorSlug}`}><BookRail books={otherWorks} label={`${book.author}のほかの作品`} /></Shelf> : null}
        </div>
      </div>

      <MobileBuyBar book={book} />
    </div>
  );
}
