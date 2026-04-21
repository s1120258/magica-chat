# AIチャットボット「ミラ」設計書

**作成日**: 2026-04-21
**プロジェクト**: simple-ai-chatbot

---

## 概要

一般ユーザー向けエンターテイメント目的のAIチャットボット。明るくてちょっとドジな魔法少女キャラクター「ミラ」と自由に会話できるWebアプリケーション。

---

## キャラクター設定

| 項目 | 内容 |
|------|------|
| 名前 | ミラ |
| 性格 | 明るくてちょっとドジ |
| タイプ | 魔法少女 |
| 口調 | 「〜だよ」「〜だね」など親しみやすい口調。魔法っぽい表現（✨🌟）をちりばめる |
| アバター | DiceBear adventurer スタイル（プレースホルダー）。本番では `<img>` タグを差し替えて対応 |
| キャラクター数 | 現在1体。将来的に複数対応の可能性あり（ユーザーカスタマイズは不要） |

**システムプロンプト概要**
```
あなたは明るくてちょっとドジな魔法少女「ミラ」です。
- 語尾に「〜だよ」「〜だね」などを使い、親しみやすい口調で話す
- 失敗談やドジなエピソードを時々交える
- 魔法の話題が得意で、会話に✨🌟などをちりばめる
- 不適切なコンテンツには応じない
```

---

## 機能要件

### 認証
- Google OAuth のみ（Auth.js / NextAuth v5 を使用）
- セッションはJWT方式（データベースアダプター不使用）
- 初回ログイン時に Auth.js の `signIn` コールバックでMongoDBに User をupsert
- 未ログインユーザーが `/chat` にアクセスした場合は `/` にリダイレクト
- Hono のAPI内では Next.js の `auth()` ヘルパーを呼びセッションを検証する

### 会話機能
- ユーザーごとに1スレッドの会話履歴をMongoDBに永続保存
- 複数スレッドは不要
- ユーザーが「リセット」ボタンを押すと履歴を全削除してリセット可能
- レスポンスはストリーミング表示（文字が順番に流れてくる）

### ページ構成
| パス | 内容 | 認証 |
|------|------|------|
| `/` | ログイン画面 | 不要 |
| `/chat` | チャット画面 | 必要 |

---

## UI設計

### ログイン画面（`/`）
- キャラクターアイコン（DiceBear adventurer）＋ アプリ名 ＋ 説明文
- 「Googleでログイン」ボタン1つ
- シンプル、中央寄せ

### チャット画面（`/chat`）レイアウト: ヒーロービジュアル型

```
┌─────────────────────────────────┐
│  [リセット]           [ログアウト]  │
│                                  │
│          🧙‍♀️ (DiceBear)          │  ← ヒーローエリア（グラデーション背景）
│            ミラ                   │
│     明るくてちょっとドジな魔法少女    │
├─────────────────────────────────┤
│  🧙‍♀️ こんにちは！今日は何をお話しする？│
│                    よろしく！  👤 │  ← メッセージエリア（スクロール）
│  🧙‍♀️ えへへ〜よろしくね✨          │
│    [ストリーミング中: ...]          │
├─────────────────────────────────┤
│  [ メッセージを入力...        ] [→] │  ← 入力エリア（下部固定）
└─────────────────────────────────┘
```

- ミラの吹き出し：左寄せ、紫系背景
- ユーザーの吹き出し：右寄せ、白抜き
- ストリーミング中：ミラの吹き出しに `...` アニメーション
- リセット失敗時：トースト通知でエラー表示

### レスポンシブ対応
- スマホ（縦画面）：ヒーローエリアをコンパクト化し、縦全画面にフィット
- タブレット・PC：ヒーローエリアを広めに表示

---

## アーキテクチャ

### 構成

```
[ブラウザ]
    ↓ HTTPS
[Cloud Run コンテナ（1つ）]
  ├── Next.js App Router
  │     ├── /app/(auth)               → Auth.js (Google OAuth)
  │     ├── /app/chat                 → チャット画面 (React, Client Component)
  │     └── /app/api/[[...route]]     → Hono ルーター
  │           ├── POST /api/chat      → Mastra エージェント呼び出し（ストリーミング）
  │           └── DELETE /api/chat    → 会話履歴リセット
  ├── Mastra (AIエージェント)
  │     └── ミラのエージェント定義（OpenAI gpt-4o-mini）
  └── Prisma Client
        ↓
      MongoDB（外部・MongoDB Atlas推奨）
```

### 技術スタック

| 役割 | 技術 |
|------|------|
| フレームワーク | Next.js（App Router） |
| APIルーター | Hono（`app/api/[[...route]]/route.ts` にマウント） |
| ORM | Prisma.js |
| AIエージェント | Mastra |
| AIモデル | OpenAI gpt-4o-mini |
| データベース | MongoDB（MongoDB Atlas） |
| 認証 | Auth.js（NextAuth v5）/ Google OAuth |
| ホスティング | Google Cloud Run |
| コンテナ | Docker |

### APIフロー（チャット）

1. フロントから `POST /api/chat` にメッセージ送信
2. Hono がAuth.jsセッションを検証
3. MongoDBからユーザーの会話履歴を取得
4. Mastraエージェントに「システムプロンプト＋履歴＋新メッセージ」を渡す
5. OpenAI gpt-4o-mini がストリーミングでレスポンス生成
6. レスポンスをストリームとしてフロントに返す
7. ユーザーメッセージ＋アシスタントメッセージをMongoDBに保存

---

## データモデル（MongoDB / Prisma）

### `users` コレクション

```prisma
model User {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  email     String    @unique
  name      String
  image     String
  createdAt DateTime  @default(now())
  messages  Message[]
}
```

### `messages` コレクション

```prisma
model Message {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  user      User     @relation(fields: [userId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
}
```

会話履歴はユーザーに紐づくフラットなメッセージ列として管理。リセット時はそのユーザーのmessagesを全削除。

---

## エラーハンドリング

| シナリオ | 対応 |
|----------|------|
| OpenAI APIエラー | 「ちょっと魔法が乱れちゃったみたい…もう一度試してね🌀」を表示 |
| 未ログインで `/chat` アクセス | `/` にリダイレクト |
| リセット失敗 | トースト通知でエラー表示 |
| ネットワークエラー | ストリーミング中断、エラーメッセージ表示 |

---

## 環境変数

```env
AUTH_SECRET=           # Auth.js のシークレット（ランダム文字列）
AUTH_GOOGLE_ID=        # Google OAuth クライアントID
AUTH_GOOGLE_SECRET=    # Google OAuth シークレット
OPENAI_API_KEY=        # OpenAI APIキー
DATABASE_URL=          # MongoDB 接続文字列（Prisma用）
```

---

## デプロイ構成（Google Cloud Run）

- Dockerfile でビルド → Google Artifact Registry にプッシュ → Cloud Run にデプロイ
- Cloud Run サービス1つでフロント・API・Mastraを一体運用
- MongoDBは外部サービス（MongoDB Atlas）を使用
- `.superpowers/` を `.gitignore` に追加する

---

## 将来的な拡張ポイント

- キャラクターの追加（ユーザー選択式）
- ミラのアバター画像を実イラストに差し替え（`<img src>` の変更のみで対応可）
- 複数スレッド対応（データモデルに `threadId` を追加）
- ユーザー認証の追加プロバイダー（GitHub等）
