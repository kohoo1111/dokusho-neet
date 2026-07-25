# 読書家ニート

「本を検索するサイト」ではなく、「本を眺めているだけで、次に読む一冊が見つかるサイト」を目指した読書メディアです。

トップページの中心は次の5カテゴリです。

- ランキング
- 受賞作品
- 名作
- テーマ別
- 作家一覧

検索機能は補助機能として残し、ヘッダー右上と `/books` に小さく配置しています。

## 使用技術

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Google Books API
- Rakuten Books API
- 国立国会図書館サーチ(NDL Search) API — 本の発掘元
- GitHub Actions — 大量取り込みの定期実行
- Vercel

## ローカル起動

```bash
pnpm install
pnpm dev
```

## ビルド

```bash
pnpm build
```

## 環境変数

値は `.env` または Vercel の Environment Variables に設定します。

| 変数名 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 公開URL。sitemap、robots、OGPに使用 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 測定ID |
| `NEXT_PUBLIC_GA_ID` | GA4測定IDの互換用 |
| `GOOGLE_BOOKS_API_KEY` | Google Books APIキー。未設定でも検索は可能 |
| `RAKUTEN_APPLICATION_ID` | 楽天ブックスAPIのアプリケーションID |
| `RAKUTEN_APP_ID` | 楽天アプリIDの互換用 |
| `RAKUTEN_ACCESS_KEY` | 楽天Books APIのアクセスキー |
| `RAKUTEN_AFFILIATE_ID` | 楽天アフィリエイトID |
| `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` | Amazonアソシエイトのトラッキングタグ。検索リンクの`tag`パラメータに付与 |

## 本の取り込み(データ拡張)

本の表示数を増やす仕組みは2段構えです。

1. **GitHub Actions**(`.github/workflows/discover-import.yml`): 3時間おきに自動実行。国立国会図書館サーチAPIでジャンル・刊行年を横断してISBNを大量発掘し、Google Books/楽天ブックスで情報を補い、無料のキーワード判定でジャンルも自動付与してデータベースに取り込みます。実行にはGitHubリポジトリのSecretsに`DATABASE_URL`・`RAKUTEN_APPLICATION_ID`・`RAKUTEN_ACCESS_KEY`(・任意で`RAKUTEN_AFFILIATE_ID`と`GOOGLE_BOOKS_API_KEY`)の設定が必要です。
2. **Vercel Cron**(`/api/cron/imports`、1日1回): ランキング・受賞作品・著名作家など優先度の高い本を毎日補充・更新します。

ローカルや手元で試す場合:

```bash
pnpm discover:import
```

## デプロイ

Vercel のプロジェクト名は `dokusho-buta` です。GitHub の本番ブランチへ反映後、Vercel が自動デプロイします。

## 注意

Google AdSense は現時点で未実装です。導入する場合は`src/app/layout.tsx`に所有権確認コード・広告コードを追加してください。