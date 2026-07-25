import { AuthorDirectory } from "@/components/authors/AuthorDirectory";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro } from "@/components/site/PageIntro";
import { authorDirectory } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";
export const metadata=createMetadata("作家一覧","日本・海外の人気作家100名以上を、人気作家・50音区切り・検索から探せます。","/authors");
export default async function Page(){const japanese=(await authorDirectory(200)).filter(author=>/[ぁ-んァ-ヶ一-龠]/.test(author.name));return <div className="netflix-page"><div className="mx-auto max-w-[1440px] px-4 md:px-8"><Breadcrumbs items={[{label:"作家一覧"}]}/><PageIntro eyebrow="Japanese authors" title="作家から選ぶ" description="日本人作家を、作品を眺める感覚で探せます。作家を開くと代表作を5冊以上表示します。"/><AuthorDirectory authors={japanese}/></div></div>}