# AI Chat MVP - フロントエンド

React + TypeScriptを使用したAIチャットアプリケーションのフロントエンド

## 必要要件

- Node.js 18+
- npm

## セットアップ

1. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、バックエンドAPIのURLを設定してください（デフォルト: http://localhost:8000）

2. 依存関係のインストール

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

サーバーは http://localhost:5173 で起動します。

## ビルド

```bash
npm run build
```

ビルドされたファイルは `dist/` ディレクトリに出力されます。

## プロジェクト構造

```
frontend/
├── src/
│   ├── components/   # Reactコンポーネント
│   ├── services/     # APIサービス
│   ├── types/        # TypeScript型定義
│   ├── App.tsx       # メインアプリケーション
│   └── main.tsx      # エントリーポイント
├── public/           # 静的ファイル
└── index.html        # HTMLテンプレート
```
