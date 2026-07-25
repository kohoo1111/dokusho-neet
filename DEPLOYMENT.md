# 読書家ニート 公開チェックリスト

## 現在の状態

- `pnpm build` 成功
- `robots.txt` 実装済み
- `sitemap.xml` 実装済み
- OGP / Twitter Card 実装済み
- favicon 実装済み
- meta description 実装済み
- Vercel用 `vercel.json` 追加済み
- `.gitignore` 設定済み

## GitHubへpushする手順

この環境では `git` CLI が見つからないため、以下はGitを使える端末またはGitHub Desktopで実行してください。

```bash
git init
git add .
git commit -m "Initial deploy for dokusho-neet"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/dokusho-neet.git
git push -u origin main
```

GitHub Desktopを使う場合:

1. `File` → `Add local repository`
2. このプロジェクトフォルダを選択
3. `Publish repository`
4. リポジトリ名を `dokusho-neet` にする
5. `Keep this code private` は必要に応じて選択

## Vercelへデプロイする手順

1. Vercelにログイン
2. `Add New...` → `Project`
3. GitHubの `dokusho-neet` リポジトリをImport
4. Framework Preset: `Next.js`
5. Install Command: `pnpm install`
6. Build Command: `pnpm build`
7. Environment Variablesを設定
8. Deploy

## Vercel環境変数

最低限:

```txt
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
DATABASE_URL=NeonのPostgreSQL接続文字列
IMPORT_SECRET=十分に長いランダム値
CRON_SECRET=十分に長いランダム値
```

外部API:

```txt
GOOGLE_BOOKS_API_KEY=任意
RAKUTEN_APPLICATION_ID=楽天Webサービスの無料アプリID
RAKUTEN_ACCESS_KEY=楽天Webサービスのアクセスキー
RAKUTEN_AFFILIATE_ID=任意
NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG=任意
```

## 公開後の確認項目

- トップページが表示される
- `/books?q=東野圭吾` で検索結果が表示される
- 楽天ブックスで見るボタンが開く
- Amazonで見るボタンが開く
- Instagramリンクが開く
- TikTokリンクが開く
- 存在しないURLが404になる
- `/robots.txt` が表示される
- `/sitemap.xml` が表示される

## 更新手順

1. ローカルで修正
2. `pnpm build` で確認
3. `git add .`
4. `git commit -m "変更内容"`
5. `git push origin main`
6. Vercelが自動デプロイ

## 独自ドメインへ変更する場合

VercelのProject Settings → Domainsでドメインを追加後、環境変数を更新します。

```txt
NEXT_PUBLIC_SITE_URL=https://dokushoneet.com
NEXTAUTH_URL=https://dokushoneet.com
```