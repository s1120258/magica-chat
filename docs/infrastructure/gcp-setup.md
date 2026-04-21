# GCP インフラストラクチャ セットアップガイド

magica-chat の Google Cloud Platform 環境構成と、セットアップ手順のドキュメント。

---

## プロジェクト情報

| 項目             | 値                        |
| ---------------- | ------------------------- |
| プロジェクトID   | `magicachat-494008`       |
| プロジェクト番号 | `465868710935`            |
| 主要リージョン   | `asia-northeast1`（東京） |

---

## 構成概要

```
GitHub (s1120258/magica-chat)
  └── Cloud Build トリガー（main ブランチへのプッシュで自動起動）
        ├── Docker イメージビルド
        ├── Artifact Registry へプッシュ
        └── Cloud Run へデプロイ
              └── Secret Manager からシークレットを注入
```

---

## 有効化済み API

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

---

## Artifact Registry

| 項目         | 値                                                                 |
| ------------ | ------------------------------------------------------------------ |
| リポジトリ名 | `magica-chat`                                                      |
| フォーマット | Docker                                                             |
| リージョン   | `asia-northeast1`                                                  |
| イメージURI  | `asia-northeast1-docker.pkg.dev/magicachat-494008/magica-chat/app` |

### 作成コマンド

```bash
gcloud artifacts repositories create magica-chat \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="magica-chat container images"
```

---

## Secret Manager

以下のシークレットが登録済み。実際の値は各自の認証情報を使用すること。

| シークレット名       | 用途                                       |
| -------------------- | ------------------------------------------ |
| `DATABASE_URL`       | MongoDB Atlas 接続文字列                   |
| `OPENAI_API_KEY`     | OpenAI API キー                            |
| `AUTH_SECRET`        | Auth.js 署名シークレット（ランダム文字列） |
| `AUTH_GOOGLE_ID`     | Google OAuth クライアント ID               |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット      |

### シークレット登録コマンド（初回）

```bash
echo -n "YOUR_VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

### シークレット更新コマンド（再登録時）

```bash
echo -n "YOUR_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

---

## Google OAuth クライアント

| 項目                            | 値                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| 種別                            | ウェブ アプリケーション                                                             |
| 名前                            | `magica-chat`                                                                       |
| 作成日                          | 2026-04-21                                                                          |
| 承認済みリダイレクトURI（開発） | `http://localhost:3000/api/auth/callback/google`                                    |
| 承認済みリダイレクトURI（本番） | `https://magica-chat-465868710935.asia-northeast1.run.app/api/auth/callback/google` |

**確認場所**: [Google Cloud Console > APIs & Services > 認証情報](https://console.cloud.google.com/apis/credentials?project=magicachat-494008)

---

## Cloud Build SA への権限付与

Cloud Build サービスアカウント（`{PROJECT_NUMBER}@cloudbuild.gserviceaccount.com`）に以下のロールを付与済み。

| ロール                               | 用途                                      |
| ------------------------------------ | ----------------------------------------- |
| `roles/artifactregistry.writer`      | Artifact Registry へのイメージプッシュ    |
| `roles/run.admin`                    | Cloud Run サービスのデプロイ              |
| `roles/iam.serviceAccountUser`       | サービスアカウントの利用                  |
| `roles/secretmanager.secretAccessor` | Secret Manager からのシークレット読み取り |

### 付与コマンド

```bash
PROJECT_NUMBER=$(gcloud projects describe magicachat-494008 --format='value(projectNumber)')

gcloud projects add-iam-policy-binding magicachat-494008 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding magicachat-494008 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding magicachat-494008 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding magicachat-494008 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Cloud Run SA への権限付与

Cloud Run のランタイムサービスアカウント（`{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`）に、Secret Manager の読み取り権限が必要。これがないと `--set-secrets` で注入するシークレットが環境変数として反映されず、`DATABASE_URL` 等が未定義になる。

| ロール                               | 用途                                       |
| ------------------------------------ | ------------------------------------------ |
| `roles/secretmanager.secretAccessor` | Secret Manager からのシークレット読み取り  |

```bash
gcloud projects add-iam-policy-binding magicachat-494008 \
  --member="serviceAccount:465868710935-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Cloud Build — GitHub 接続とトリガー

### GitHub 接続

| 項目               | 値                                        |
| ------------------ | ----------------------------------------- |
| 接続名             | `GitHub`                                  |
| リージョン         | `asia-northeast1`                         |
| GitHub アカウント  | `s1120258`                                |
| リンクリポジトリ名 | `s1120258-magica-chat`                    |
| リポジトリ URL     | `https://github.com/s1120258/magica-chat` |

接続はコンソールから作成（GitHub App インストールによる OAuth 認証が必要なため）：
[Cloud Build > リポジトリ](https://console.cloud.google.com/cloud-build/repositories?project=magicachat-494008)

### トリガー設定

| 項目               | 値                    |
| ------------------ | --------------------- |
| トリガー名         | `deploy-on-main-push` |
| リージョン         | `asia-northeast1`     |
| イベント           | ブランチへのプッシュ  |
| ブランチパターン   | `^main$`              |
| ビルド構成ファイル | `cloudbuild.yaml`     |

トリガーはコンソールから作成：
[Cloud Build > トリガー > トリガーを作成](https://console.cloud.google.com/cloud-build/triggers?project=magicachat-494008)

---

## Cloud Run

`cloudbuild.yaml` によって自動デプロイされる。

| 項目             | 値                                                                              |
| ---------------- | ------------------------------------------------------------------------------- |
| サービス名       | `magica-chat`                                                                   |
| リージョン       | `asia-northeast1`                                                               |
| プラットフォーム | managed（フルマネージド）                                                       |
| 認証             | `--allow-unauthenticated`（一般公開）                                           |
| 公開 URL         | `https://magica-chat-465868710935.asia-northeast1.run.app`                      |
| 注入シークレット | 上記 Secret Manager の5件すべて                                                 |

---

## MongoDB Atlas — ネットワークアクセス設定

Cloud Run はデプロイごとに異なる IP を使用するため、MongoDB Atlas の IP 許可リストに `0.0.0.0/0`（Allow Access from Anywhere）を設定する必要がある。

**設定場所**: MongoDB Atlas > Network Access > Add IP Address > `0.0.0.0/0`

---

## デプロイ後の確認事項

1. **Google OAuth のリダイレクト URI を追加**（初回のみ）

   [Google Cloud Console > 認証情報](https://console.cloud.google.com/apis/credentials?project=magicachat-494008) を開き、OAuth クライアントに以下を追加：

   ```
   https://magica-chat-465868710935.asia-northeast1.run.app/api/auth/callback/google
   ```

2. **OAuth テストユーザーの追加**（テスト公開中の場合）

   [OAuth 同意画面 > テストユーザー](https://console.cloud.google.com/apis/credentials/consent?project=magicachat-494008) にログイン予定のメールアドレスを追加する。

---

## 環境変数の管理

ローカル開発は `.env.local` を使用し、本番環境は Secret Manager 経由で Cloud Run に注入する。

| 変数名               | ローカル     | 本番           |
| -------------------- | ------------ | -------------- |
| `DATABASE_URL`       | `.env.local` | Secret Manager |
| `OPENAI_API_KEY`     | `.env.local` | Secret Manager |
| `AUTH_SECRET`        | `.env.local` | Secret Manager |
| `AUTH_GOOGLE_ID`     | `.env.local` | Secret Manager |
| `AUTH_GOOGLE_SECRET` | `.env.local` | Secret Manager |

> `.env.local` は `.gitignore` に含まれており、リポジトリにコミットされない。
