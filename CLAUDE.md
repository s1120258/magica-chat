# simple-ai-chatbot — CLAUDE.md

一般ユーザー向けエンターテイメントAIチャットボット。魔法少女キャラクター「エマ」と会話するWebアプリ。

詳細設計書: [docs/superpowers/specs/2026-04-21-ai-chatbot-design.md](docs/superpowers/specs/2026-04-21-ai-chatbot-design.md)

---

## キャラクター

**エマ** — 明るくてちょっとドジな魔法少女。「〜だよ」「〜だね」口調、魔法表現（✨🌸）を使う。キャラクター数は現在1体（将来的に複数対応の可能性あり）。

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フレームワーク | Next.js App Router |
| APIルーター | Hono（`app/api/[[...route]]/route.ts` にマウント） |
| ORM | Prisma.js |
| AIエージェント | Mastra |
| AIモデル | OpenAI gpt-4o-mini |
| データベース | MongoDB（MongoDB Atlas） |
| 認証 | Auth.js v5（NextAuth）/ Google OAuth / JWT方式 |
| ホスティング | Google Cloud Run（モノリス構成・1コンテナ） |

---

## ページ構成

| パス | 内容 | 認証 |
|------|------|------|
| `/` | ログイン画面（Googleログインボタン） | 不要 |
| `/chat` | チャット画面 | 必要（未認証は `/` へリダイレクト） |

---

## API

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/chat` | Mastraエージェント呼び出し（ストリーミング） |
| DELETE | `/api/chat` | 会話履歴リセット（ユーザーのmessages全削除） |

---

## データモデル（Prisma / MongoDB）

```prisma
model User {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  email     String    @unique
  name      String
  image     String
  createdAt DateTime  @default(now())
  messages  Message[]
}

model Message {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  user      User     @relation(fields: [userId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
}
```

---

## 認証フロー

- Auth.js v5 / JWT方式（DBアダプター不使用）
- 初回ログイン時に `signIn` コールバックで MongoDB に User を upsert
- Hono API 内では `auth()` ヘルパーでセッション検証

---

## UI設計

**レイアウト**: ヒーロービジュアル型（上部にキャラクターアイコン＋名前、下部にチャット）

### キャラクターアイコン

- ファイル: `public/images/emma-icon.png`（©Acacia、提供済み free icon）
- 実装: `<img src="/images/emma-icon.png" />` — 将来的な差し替えはこのファイルを置き換えるだけ

### カラーパレット（エマのキャラカラー準拠）

| 用途 | カラーコード |
| ---- | ----------- |
| 背景 | `#12091e`（深いダークパープル） |
| ヒーローエリア | `#2d1848`（ミッドナイトパープル） |
| ユーザー吹き出し | `#3d2060` |
| アクセント（ボーダー・ボタン） | `#e879a0`（サクラピンク） |
| メインテキスト | `#ffd6e8`（ソフトピンクホワイト） |
| サブテキスト | `#c9a0c0` |
| 送信ボタン | グラデーション `#e879a0 → #c040a0` |

### その他UI仕様

- ストリーミング表示: 応答中は `...` アニメーション
- 右上ボタン: 「🌸 リセット」「ログアウト」
- レスポンシブ対応（スマホ縦画面でもフィット）
- エマの吹き出し: 左寄せ、`#2d184844` 背景 + `#e879a022` ボーダー
- ユーザーの吹き出し: 右寄せ、`#3d2060` 背景

---

## 環境変数

```env
AUTH_SECRET=           # Auth.js シークレット
AUTH_GOOGLE_ID=        # Google OAuth クライアントID
AUTH_GOOGLE_SECRET=    # Google OAuth シークレット
OPENAI_API_KEY=        # OpenAI APIキー
DATABASE_URL=          # MongoDB 接続文字列
```

---

## エラーハンドリング方針

| シナリオ | 対応 |
|----------|------|
| OpenAI APIエラー | 「ちょっと魔法が乱れちゃったみたい…もう一度試してね🌸」を表示 |
| 未ログインで `/chat` アクセス | `/` にリダイレクト |
| リセット失敗 | トースト通知でエラー表示 |
| ネットワークエラー | ストリーミング中断、エラーメッセージ表示 |

---

## デプロイ

- Dockerfile → Google Artifact Registry → Cloud Run（1サービス）
- MongoDB は MongoDB Atlas（外部）
- `.superpowers/` は `.gitignore` に追加済み

---

## 将来的な拡張ポイント

- キャラクター追加（ユーザー選択式）
- 複数スレッド対応（`threadId` をデータモデルに追加）
- 追加の OAuth プロバイダー（GitHub等）
