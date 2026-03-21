[한국어](./README.ko.md) | [English](./README.en.md) | [简体中文](./README.zh-cn.md) | **日本語** | [Español](./README.es.md) | [Português (BR)](./README.pt-br.md) | [Français](./README.fr.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

# SHOT!

**AI対応マルチプレイヤーターン制カードゲーム**

5～12名のプレイヤーがエージェントとスパイに分かれ、心理戦を繰り広げる戦略カードゲーム。AI対応ボットプレイヤー、リプレイシステム、9言語対応で、誰もが楽しめます。

[ゲームをプレイ](https://shot.game/) | [ドキュメント](./docs/) | [GitHub](https://github.com/epsilondelta/shot)

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [主な特徴](#主な特徴)
3. [ゲームルール](#ゲームルール)
4. [技術スタック](#技術スタック)
5. [クイックスタート](#クイックスタート)
6. [環境変数](#環境変数)
7. [デプロイメント](#デプロイメント)
8. [ライセンス](#ライセンス)

---

## プロジェクト概要

**SHOT!** は、情報隠蔽とターン制カードゲームの要素を組み合わせた、オンラインマルチプレイヤー戦略ゲームです。

### ゲームの舞台

- **プレイヤー数**: 5～12名（人間 + AIボット混在可能）
- **チーム構成**: エージェント（多数派）vs スパイ（少数派）
- **ゲーム形式**: ターン制リアルタイムプレイ
- **ゲーム時間**: 通常30～60分（プレイヤー数により変動）

### 対応言語

- 日本語（ja）、韓国語（ko）、英語（en）、簡体字中国語（zh-cn）、スペイン語（es）、ポルトガル語（pt-br）、フランス語（fr）、ロシア語（ru）、ドイツ語（de）

---

## 主な特徴

| 機能 | 説明 |
|------|------|
| **AI対応** | Claude、GPT、DeepSeekなどの外部AIを活用したボットプレイヤー |
| **リアルタイム同期** | SSE（Server-Sent Events）+ Redis Pub/Subによる高速同期 |
| **ボットAPI** | 外部AIボットがRESTful API + SSEでゲームに参加可能 |
| **ゲームリプレイ** | すべてのゲームアクションを記録、再生可能。高評価・お気に入り機能付き |
| **認証・セキュリティ** | Google OAuth 2.0 + JWT認証、高速パスワード検証 |
| **PWA対応** | プログレッシブウェブアプリ対応で、オフライン表示可能 |
| **多言語対応** | Paraglide i18nにより9言語でシームレスにプレイ可能 |
| **管理パネル** | LLMボット設定・プレイヤー管理・ゲーム統計の一元管理 |

---

## ゲームルール

### 基本ルール

#### チーム分け
- **エージェント**: ゲーム開始時にプレイヤーに秘密裏に振り分けられる（多数派）
- **スパイ**: エージェントより少数。スパイはお互いの正体を知ることができる

#### ゲームの勝利条件

| チーム | 勝利条件 |
|--------|---------|
| **エージェント** | すべてのスパイを排除する |
| **スパイ** | すべてのエージェントを排除する |

#### プレイヤーステータス

- **HP（体力）**: 初期値3HP、1HP単位で管理
- **カード**: 初期手札2枚、各ターン最大1枚ドロー
- **ステータス異常**: 投獄中はターンをスキップ（1～2ターン）

### カードシステム

#### カードの種類

| カード | 効果 | 説明 |
|--------|------|------|
| **攻撃** | -1 HP | 対象プレイヤーのHPを1減らす |
| **回復** | +1 HP | 自分のHPを1増やす |
| **投獄** | スキップ | 対象プレイヤーを1～2ターン投獄、ターンをスキップさせる |
| **調査** | 正体開示 | 対象プレイヤーの正体（エージェント or スパイ）を確認 |

### ターンメカニクス

#### ターンの流れ

1. **攻撃フェーズ**: ≥1の攻撃カードを使用する（必須）
   - 投獄状態でない限り、最低1枚の攻撃カードを使用する必要があります
   - 複数のカードを同時に使用可能

2. **カードドロー**: ターン終了時にカードを1枚引く
   - キル時（相手HP 0）: +1 HPと追加1枚カードドロー

3. **ターンタイマー**: 2分
   - タイマー切れで自動的に対象ランダムで攻撃を実行

#### ターン制限
- **最大ターン数**: プレイヤー数 × 3
- **制限到達**: 双方のプレイヤー数が同数の場合、引き分けで終了

### スパイ情報

- **スパイ同士の通信**: ゲーム開始時に全スパイに対面表が表示される
- **エージェント**: 他プレイヤーの正体は不明。調査カードで確認可能
- **情報管理**: スパイの正体は秘密に保つこと（ゲーム有利の重要要素）

---

## 技術スタック

### バックエンド

| 項目 | 技術 |
|------|------|
| **言語** | Go 1.25 |
| **Webフレームワーク** | Fiber v2 (github.com/gofiber/fiber/v2) |
| **ORM** | GORM (gorm.io/gorm) |
| **データベース** | PostgreSQL (gorm.io/driver/postgres + pgx v5) |
| **キャッシュ/Pub-Sub** | Redis (github.com/redis/go-redis/v9) |
| **認証** | JWT (golang-jwt/jwt v5)、OAuth 2.0 (Google) |
| **暗号化** | bcrypt (golang.org/x/crypto) |
| **UUID生成** | github.com/google/uuid |
| **モジュール** | github.com/epsilondelta/shot |

### フロントエンド

| 項目 | 技術 |
|------|------|
| **フレームワーク** | Astro 5.0（静的サイト生成） |
| **言語** | TypeScript 5.0 |
| **スタイル** | Tailwind CSS 3.4 |
| **パッケージ管理** | Bun |
| **多言語対応** | Paraglide (inlang) |
| **サイトマップ** | @astrojs/sitemap |
| **サーバー** | Nginx（静的ファイル配信） |

### インフラストラクチャ

| 項目 | 技術 |
|------|------|
| **コンテナ化** | Docker Compose |
| **データベース** | PostgreSQL 17-alpine |
| **キャッシュ** | Redis 7-alpine |
| **リバースプロキシ** | Nginx (nginx:alpine) |
| **SSL/TLS** | Let's Encrypt + Certbot（自動更新） |
| **ビルド** | Makefile |

---

## クイックスタート

### 前提条件

- Docker & Docker Compose
- Go 1.25+ (ローカル開発用)
- Node.js 20+ & Bun (フロントエンド開発用)
- PostgreSQL 17+ (オプション: ローカル開発)
- Redis 7+ (オプション: ローカル開発)

### インストール

1. **リポジトリをクローン**

```bash
git clone https://github.com/epsilondelta/shot.git
cd shot
```

2. **環境変数ファイルを作成**

```bash
cp .env.example .env
# .envファイルを編集して、APIキーなどを設定してください
```

3. **Dockerコンテナを起動**

```bash
docker-compose up -d
```

4. **データベースをマイグレーション**

```bash
# バックエンドコンテナ内で実行
docker-compose exec backend go run ./cmd/migrate
```

5. **ブラウザでアクセス**

```
http://localhost:3000
```

### ローカル開発設定

#### バックエンド開発

```bash
# バックエンドディレクトリに移動
cd backend

# 依存関係をインストール
go mod download

# 開発サーバーを起動
go run ./cmd/api
```

#### フロントエンド開発

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存関係をインストール
bun install

# 開発サーバーを起動
bun run dev

# ブラウザで開く: http://localhost:3000
```

### 本番環境デプロイメント

```bash
# 本番用Docker Composeファイルを使用
docker-compose -f docker-compose.prod.yml up -d

# SSL証明書を初期化（初回のみ）
./init-letsencrypt.sh
```

---

## 環境変数

`.env` ファイルで以下の環境変数を設定してください。

### バックエンド設定

```env
# データベース
DB_HOST=postgres
DB_PORT=5432
DB_USER=shot
DB_PASSWORD=your_secure_password
DB_NAME=shot_db

# Redis
REDIS_URL=redis://redis:6379

# JWT認証
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# サーバー設定
SERVER_PORT=8080
SERVER_ENV=development

# ボットAPI設定
BOT_API_ENABLED=true
BOT_PROVIDERS=claude,gpt,deepseek
```

### フロントエンド設定

```env
# API設定
PUBLIC_API_URL=http://localhost:8080
PUBLIC_GAME_URL=http://localhost:3000

# Astro設定
NODE_ENV=development
```

### セキュリティ設定

```env
# CORS許可リスト
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# レート制限
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# セッション設定
SESSION_TIMEOUT=3600000
REFRESH_TOKEN_EXPIRY=604800000
```

---

## デプロイメント

### Dockerを使用したデプロイメント

1. **イメージのビルド**

```bash
docker-compose build
```

2. **コンテナの起動**

```bash
docker-compose up -d
```

3. **ログの確認**

```bash
docker-compose logs -f
```

### SSL証明書の設定

Let's Encryptを使用した自動更新設定：

```bash
# 初回セットアップ
./init-letsencrypt.sh

# Certbotコンテナが自動的に更新します
```

### ヘルスチェック

```bash
# APIのステータス確認
curl http://localhost:8080/health

# フロントエンドのステータス確認
curl http://localhost:3000
```

---

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](../../LICENSE)ファイルをご覧ください。

---

## サポートとフィードバック

- **Issues**: [GitHub Issues](https://github.com/epsilondelta/shot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/epsilondelta/shot/discussions)
- **Email**: support@shot.game

---

## 貢献ガイドライン

プロジェクトへの貢献を歓迎します！

1. フォークしてブランチを作成
2. 機能を実装
3. テストを追加
4. プルリクエストを送信

詳細は[CONTRIBUTING.md](../../CONTRIBUTING.md)をご覧ください。

---

**Last Updated**: 2026年3月21日
**Version**: 0.0.1-alpha
