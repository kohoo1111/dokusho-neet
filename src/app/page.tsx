import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, Heart, PenTool, Trophy } from "lucide-react";
import { BookCard, BookRail } from "@/components/books/BookCard";
import { authorDirectory, awardShelf, discoveryShelf, rankingShelf } from "@/lib/catalog-repository";

export const revalidate = 3600;

const categories=[
 {href:"/ranking",label:"ランキング",sub:"いま売れている20冊",icon:BarChart3,tone:"bg-[#a44d31] text-white"},
 {href:"/awards",label:"受賞作品",sub:"14の文学賞から",icon:Trophy,tone:"bg-[#334c4a] text-white"},
 {href:"/classics",label:"名作",sub:"時代を越える本",icon:BookOpen,tone:"bg-[#d9cdb9] text-[#211e1a]"},
 {href:"/authors",label:"作家",sub:"日本人作家30人",icon:PenTool,tone:"bg-[#4d5068] text-white"},
 {href:"/themes",label:"テーマ",sub:"気分から選ぶ",icon:Heart,tone:"bg-[#8a5a62] text-white"},
];
function Section({title,href,children}:{title:string;href:string;children:React.ReactNode}){return <section className="mx-auto max-w-[1440px] overflow-hidden px-4 py-6 md:px-8 md:py-8"><div className="flex items-end justify-between gap-4"><h2 className="rail-title">{title}</h2><Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-black/50 hover:text-black">すべて見る<ArrowRight size={15}/></Link></div><div className="mt-3">{children}</div></section>}

export default async function Home(){const [ranking,awarded,mystery,romance,selfHelp,homeAuthors]=await Promise.all([rankingShelf(20),awardShelf({limit:20}),discoveryShelf({themeSlug:"mystery",fallbackTheme:"ミステリー",limit:20}),discoveryShelf({themeSlug:"romance",fallbackTheme:"恋愛",limit:20}),discoveryShelf({themeSlug:"self-help",fallbackTheme:"自己啓発",limit:20}),authorDirectory(30)]);const newPopular=ranking.slice(0,3);return <>
 <section className="hero-stage overflow-hidden bg-[#151412] text-white"><div className="mx-auto grid max-w-[1280px] gap-14 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><p className="eyebrow !text-[#cf8a6d]">Find your next book</p><h1 className="mt-5 font-serif text-[clamp(3.2rem,7vw,6.8rem)] font-semibold leading-[1.02] tracking-[-.06em]">あなたへ<br/>最高の一冊を。</h1></div><div className="grid grid-cols-3 gap-4 md:gap-7">{newPopular.map(book=><BookCard key={book.id} book={book} priority hideActions showMeta/>)}</div></div></section>
 <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-8"><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{categories.map(({href,label,sub,icon:Icon,tone},index)=><Link key={href} href={href} className={`category-card group min-h-36 rounded-2xl p-5 shadow-xl transition duration-300 hover:-translate-y-1 md:min-h-44 ${index===0?'col-span-2 md:col-span-1':''} ${tone}`}><Icon size={22}/><div className="mt-7"><h2 className="text-xl font-bold">{label}</h2><p className="mt-2 text-xs opacity-65">{sub}</p></div></Link>)}</div></section>
 <Section title="今売れている本 TOP20" href="/ranking"><BookRail books={ranking} ranked/></Section>
 <Section title="受賞作品" href="/awards"><BookRail books={awarded}/></Section>
 <Section title="ミステリー" href="/themes/mystery"><BookRail books={mystery} discoveryKey="home:mystery"/></Section>
 <Section title="恋愛" href="/themes/romance"><BookRail books={romance} discoveryKey="home:romance"/></Section>
 <Section title="自己啓発" href="/themes/self-help"><BookRail books={selfHelp} discoveryKey="home:self-help"/></Section>
 <Section title="作家から出会う" href="/authors"><div className="book-rail flex gap-3 overflow-x-auto scroll-smooth pb-6">{homeAuthors.filter(author=>/[ぁ-んァ-ヶ一-龠]/.test(author.name)).slice(0,12).map(author=><Link key={author.slug} href={`/authors/${author.slug}`} className="w-48 shrink-0 rounded-xl border border-black/[.08] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><p className="line-clamp-1 font-serif text-xl font-semibold">{author.name}</p><p className="mt-3 text-[11px] text-black/45">代表作5冊以上</p></Link>)}</div></Section>
 </>}