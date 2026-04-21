# magica-chat

魔法少女キャラクター「エマ」と会話できる、一般ユーザー向けエンターテイメント AI チャットボット。

---

## サービス URL

| 環境     | URL                                                                      |
| -------- | ------------------------------------------------------------------------ |
| 本番     | <https://magica-chat-465868710935.asia-northeast1.run.app>               |
| ローカル | <http://localhost:3000>                                                  |

---

## キャラクター

**エマ** — 明るくてちょっとドジな魔法少女。「〜だよ」「〜だね」口調で、魔法表現（✨🌸）を使いながら会話します。

---

## 主な機能

- Google アカウントでログイン
- AI キャラクター「エマ」とのストリーミングチャット
- 会話履歴の保存・表示
- 会話履歴のリセット

---

## アーキテクチャ

```text
ブラウザ
  └── Next.js App Router（Google Cloud Run）
        ├── /           ログイン画面（Google OAuth）
        ├── /chat        チャット画面
        └── /api/chat    Mastra エージェント（OpenAI gpt-4o-mini）
                              └── Prisma → MongoDB Atlas（会話履歴）
```

| 役割            | 技術                                            |
| --------------- | ----------------------------------------------- |
| フレームワーク  | Next.js 16 App Router                           |
| API ルーター    | Hono                                            |
| AI エージェント | Mastra + OpenAI gpt-4o-mini                     |
| ORM             | Prisma v6 + MongoDB Atlas                       |
| 認証            | Auth.js v5（Google OAuth / JWT）                |
| ホスティング    | Google Cloud Run（asia-northeast1）             |
| CI/CD           | Cloud Build（main ブランチ push で自動デプロイ）|

---

## ローカル開発

### 前提条件

- Node.js 20+
- MongoDB Atlas クラスター（または接続文字列）
- Google OAuth クライアント ID / シークレット
- OpenAI API キー

### セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` に以下を設定:

```env
AUTH_SECRET=           # openssl rand -base64 32 で生成
AUTH_GOOGLE_ID=        # Google OAuth クライアント ID
AUTH_GOOGLE_SECRET=    # Google OAuth クライアントシークレット
OPENAI_API_KEY=        # OpenAI API キー
DATABASE_URL=          # MongoDB Atlas 接続文字列
```

Google OAuth の承認済みリダイレクト URI に `http://localhost:3000/api/auth/callback/google` を追加してください。

### 起動

```bash
npm run dev
```

<http://localhost:3000> でアクセスできます。

---

## デプロイ

`main` ブランチへの push で Cloud Build が自動的にビルド・デプロイします。

手動デプロイや GCP 環境のセットアップ手順は [docs/infrastructure/gcp-setup.md](docs/infrastructure/gcp-setup.md) を参照してください。

---

## API

| メソッド | パス        | 説明                                        | 認証 |
| -------- | ----------- | ------------------------------------------- | ---- |
| POST     | `/api/chat` | エマとのチャット（ストリーミングレスポンス）| 必要 |
| DELETE   | `/api/chat` | 会話履歴をリセット                          | 必要 |

---

## 詳細ドキュメント

- [設計書](docs/superpowers/specs/2026-04-21-ai-chatbot-design.md)
- [GCP インフラ構成](docs/infrastructure/gcp-setup.md)
