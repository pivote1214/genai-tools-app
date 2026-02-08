# AI Chat MVP - フロントエンド

React + TypeScriptを使用したAIチャットアプリケーションのフロントエンド

## 必要要件

- Node.js 18+
- npm

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、バックエンドAPIのURLを設定してください：

```bash
# バックエンドAPIのURL
VITE_API_BASE_URL=http://localhost:8000
```

**注意**: デフォルト値は`http://localhost:8000`なので、バックエンドがデフォルトポートで起動している場合は編集不要です。

### 2. 依存関係のインストール

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

サーバーは http://localhost:5173 で起動します。

**注意**: バックエンドサーバーが起動していることを確認してください。

## テストの実行

### ユニットテスト・統合テスト

```bash
# すべてのテストを実行
npm test

# ウォッチモードでテストを実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage
```

### E2Eテスト（Playwright）

```bash
# E2Eテストを実行
npm run test:e2e

# UIモードでE2Eテストを実行（デバッグに便利）
npm run test:e2e:ui

# ヘッドモードでE2Eテストを実行（ブラウザを表示）
npm run test:e2e:headed
```

**注意**: E2Eテストは自動的に開発サーバーを起動しますが、バックエンドサーバーは別途起動しておく必要があります。

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
