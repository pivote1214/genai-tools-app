# AI Chat MVP - バックエンド

FastAPIを使用したAIチャットアプリケーションのバックエンドAPI

## 必要要件

- Python 3.12+
- uv (Pythonパッケージマネージャー)

## セットアップ

1. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、APIキーを設定してください：
- `OPENAI_API_KEY`: OpenAI APIキー
- `ANTHROPIC_API_KEY`: Anthropic (Claude) APIキー

2. 依存関係のインストール

```bash
uv sync
```

## 開発サーバーの起動

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

サーバーは http://localhost:8000 で起動します。

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
