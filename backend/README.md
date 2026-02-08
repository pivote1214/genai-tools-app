# AI Chat MVP - バックエンド

FastAPIを使用したAIチャットアプリケーションのバックエンドAPI

## 必要要件

- Python 3.12+
- uv (Pythonパッケージマネージャー)
- OpenAI APIキー / Anthropic (Claude) APIキー / Google Gemini APIキー（少なくとも1つ必要）

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、APIキーを設定してください：

```bash
# OpenAI API設定（OpenAIモデルを使用する場合）
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic (Claude) API設定（Claudeモデルを使用する場合）
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Gemini API設定（Geminiモデルを使用する場合）
GEMINI_API_KEY=your_gemini_api_key_here
# 互換: GOOGLE_API_KEYでも可
# GOOGLE_API_KEY=your_google_api_key_here

# データベース設定（デフォルトのまま使用可能）
DATABASE_URL=sqlite:///./chat.db

# サーバー設定（デフォルトのまま使用可能）
HOST=0.0.0.0
PORT=8000

# CORS設定（フロントエンドのURL、デフォルトのまま使用可能）
FRONTEND_URL=http://localhost:5173
```

**重要**: 
- 少なくとも`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`（または`GOOGLE_API_KEY`）のいずれか1つを設定する必要があります。
- 複数のAPIキーを設定すると、対応するすべてのモデルが利用可能になります。

### 1.1 Google Gemini APIキーの取得手順

1. [Google AI Studio](https://aistudio.google.com/apikey) を開く
2. `Create API key` をクリックしてキーを発行する
3. `backend/.env` に `GEMINI_API_KEY=...` を設定する（必要なら `GOOGLE_API_KEY=...` でも可）
4. サーバーを再起動し、`GET /api/models` に Gemini モデルが含まれることを確認する

### 2. 依存関係のインストール

```bash
uv sync
```

これにより、`pyproject.toml`に定義されたすべての依存関係（`python-dotenv`を含む）がインストールされます。

**注意**: `python-dotenv`パッケージにより、`.env`ファイルが自動的に読み込まれます。

## 開発サーバーの起動

```bash
uv run uvicorn main:app --reload
```

サーバーは http://localhost:8000 で起動します。

**オプション**: ホストとポートを指定する場合：

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## テストの実行

```bash
# すべてのテストを実行
uv run pytest

# 詳細な出力で実行
uv run pytest -v

# 特定のテストファイルを実行
uv run pytest tests/test_message_persistence.py

# カバレッジレポートを生成
uv run pytest --cov=app --cov-report=html
```

## APIドキュメント

サーバー起動後、以下のURLでAPIドキュメントを確認できます：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## プロジェクト構造

```
backend/
├── app/
│   ├── api/          # APIエンドポイント
│   ├── models/       # データベースモデル
│   ├── repositories/ # データベースリポジトリ
│   └── services/     # ビジネスロジック・LLMサービス
├── main.py           # アプリケーションエントリーポイント
├── .env.example      # 環境変数のサンプル
└── pyproject.toml    # プロジェクト設定
```
