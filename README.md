# AI Chat MVP

OpenAIとClaudeの複数のLLMモデルに対応したストリーミングチャット機能を持つWebアプリケーション

## 概要

このプロジェクトは、生成AIチャットアプリケーションのMVP（Minimum Viable Product）です。
- バックエンド: FastAPI + Python
- フロントエンド: React + TypeScript
- データベース: SQLite

## 機能

- 複数のLLMモデルに対応
- ストリーミングレスポンスによるリアルタイムチャット
- チャット履歴の永続化
- モデル選択機能

## セットアップ

### 前提条件

- **バックエンド**: Python 3.11+、uv (Pythonパッケージマネージャー)
- **フロントエンド**: Node.js 18+、npm
- **APIキー**: OpenAI APIキーまたはAnthropic (Claude) APIキー（少なくとも1つ必要）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd genai-tools-app
```

### 2. バックエンドのセットアップ

#### 2.1 環境変数の設定

```bash
cd backend
cp .env.example .env
```

`.env`ファイルを編集して、APIキーを設定してください：

```bash
# OpenAI API設定（OpenAIモデルを使用する場合）
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic (Claude) API設定（Claudeモデルを使用する場合）
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# データベース設定（デフォルトのまま使用可能）
DATABASE_URL=sqlite:///./chat.db

# サーバー設定（デフォルトのまま使用可能）
HOST=0.0.0.0
PORT=8000

# CORS設定（フロントエンドのURL、デフォルトのまま使用可能）
FRONTEND_URL=http://localhost:5173
```

**重要**: 少なくとも`OPENAI_API_KEY`または`ANTHROPIC_API_KEY`のいずれか1つを設定する必要があります。

#### 2.2 依存関係のインストール

```bash
uv sync
```

### 3. フロントエンドのセットアップ

リポジトリルートに戻ってから、以下を実行してください。

#### 3.1 環境変数の設定

```bash
cd frontend
cp .env.example .env
```

`.env`ファイルを編集して、バックエンドAPIのURLを設定してください（デフォルトで問題ない場合は編集不要）：

```bash
# バックエンドAPIのURL
VITE_API_BASE_URL=http://localhost:8000
```

#### 3.2 依存関係のインストール

```bash
npm install
```

### 4. 開発サーバーを一括起動（推奨）

```bash
make dev
```

1つのターミナルでバックエンドとフロントエンドが同時起動し、ログには`[backend]` / `[frontend]`のプレフィックスが付きます。  
停止する場合は`Ctrl+C`、または別ターミナルで以下を実行してください。

```bash
make stop
```

### 5. 個別起動（デバッグ用）

```bash
# バックエンドのみ
make dev-backend

# フロントエンドのみ
make dev-frontend
```

従来どおり以下の直接実行も可能です。

```bash
cd backend && uv run uvicorn main:app --reload
cd frontend && npm run dev
```

### 6. アプリケーションへのアクセス

ブラウザで http://localhost:5173 を開いてください。チャットインターフェースが表示され、設定したAPIキーに対応するLLMモデルが選択可能になります。

## トラブルシューティング

### バックエンドが起動しない

- **エラー: "No API keys configured"**
  - `.env`ファイルに少なくとも1つのAPIキー（`OPENAI_API_KEY`または`ANTHROPIC_API_KEY`）が設定されているか確認してください。
  - APIキーの前後に余分なスペースや引用符がないか確認してください。

- **エラー: "Address already in use"**
  - ポート8000が既に使用されています。他のプロセスを停止するか、別のポートを使用してください。
  - `make dev`で起動中なら、まず`make stop`で停止できます。
  - 別ポートを使用する場合：
    ```bash
    uv run uvicorn main:app --reload --port 8001
    ```

### フロントエンドからバックエンドに接続できない

- バックエンドが起動しているか確認してください（http://localhost:8000 にアクセスして確認）
- `.env`ファイルの`VITE_API_BASE_URL`が正しいか確認してください
- ブラウザのコンソールでCORSエラーが出ていないか確認してください

### モデルが表示されない

- 使用したいモデルに対応するAPIキーが`.env`ファイルに設定されているか確認してください
- バックエンドのログを確認して、APIキーが正しく読み込まれているか確認してください

## テストの実行

### バックエンドのテスト

```bash
cd backend
uv run pytest
```

### フロントエンドのテスト

```bash
cd frontend
npm test
```

## 開発

リポジトリルートで以下のコマンドを利用できます。

- `make dev`: バックエンドとフロントエンドを同時起動
- `make dev-backend`: バックエンドのみ起動
- `make dev-frontend`: フロントエンドのみ起動
- `make stop`: `make dev`で起動したプロセスを停止

## プロジェクト構造

```
.
├── backend/          # FastAPIバックエンド
│   ├── app/
│   │   ├── api/      # APIエンドポイント
│   │   ├── models/   # データベースモデル
│   │   ├── repositories/  # データベースリポジトリ
│   │   └── services/ # LLMサービス
│   └── main.py       # エントリーポイント
├── frontend/         # React + TypeScriptフロントエンド
│   └── src/
│       ├── components/  # UIコンポーネント
│       ├── services/    # APIサービス
│       └── types/       # 型定義
└── .kiro/
    └── specs/
        └── ai-chat-mvp/  # 仕様書
```

## ライセンス

MIT
