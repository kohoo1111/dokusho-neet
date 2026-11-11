import { AuthorDirectory } from "@/components/authors/AuthorDirectory";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageIntro, PageShell } from "@/components/site/PageIntro";
import { authorDirectory } from "@/lib/catalog-repository";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata("作家一覧", "人気の日本人作家を、人気順・検索から探せます。作家を開くと代表作を一覧できます。", "/authors");
export const revalidate = 3600;

export default async function Page() {
  const japanese = (await authorDirectory(200)).filter((author) => /[ぁ-んァ-ヶ一-龠]/.test(author.name));
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "作家一覧" }]} />
      <PageIntro eyebrow="Japanese authors" title="作家から選ぶ" description="日本人作家を、作品を眺める感覚で探せます。作家を開くと代表作を表示します。" />
      <AuthorDirectory authors={japanese} />
    </PageShell>
  );
}
