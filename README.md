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

### 1. バックエンドのセットアップ

```bash
cd backend
cp .env.example .env
# .envファイルを編集してAPIキーを設定
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

詳細は [backend/README.md](backend/README.md) を参照してください。

### 2. フロントエンドのセットアップ

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

詳細は [frontend/README.md](frontend/README.md) を参照してください。

## 開発

バックエンドとフロントエンドを別々のターミナルで起動してください：

1. バックエンド: http://localhost:8000
2. フロントエンド: http://localhost:5173

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