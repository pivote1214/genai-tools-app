# 要件定義書

## はじめに

本文書は、生成AIの便利ツールを載せるWebアプリケーションのMVP（Minimum Viable Product）として、チャット機能を実装するための要件を定義します。このMVPでは、OpenAIとClaudeの複数のLLMモデルに対応したチャットインターフェースを提供し、ストリーミングレスポンスによるリアルタイムな対話体験を実現します。

## 用語集

- **System**: チャットアプリケーション全体
- **Chat_Interface**: ユーザーがメッセージを入力・表示するフロントエンドUI
- **API_Gateway**: バックエンドのFastAPIサーバー
- **LLM_Provider**: OpenAIまたはClaudeのAPIサービス
- **Message_Store**: SQLiteデータベースによるメッセージ永続化層
- **Streaming_Response**: Server-Sent Eventsを使用したリアルタイムレスポンス
- **Chat_Session**: ユーザーとLLMの一連の対話
- **Model_Selector**: LLMモデルを選択するUI要素

## 要件

### 要件1: チャットメッセージの送受信

**ユーザーストーリー:** ユーザーとして、選択したLLMモデルとリアルタイムで対話したい。そうすることで、生成AIを活用した問題解決ができる。

#### 受入基準

1. WHEN ユーザーがメッセージを入力してEnterキーを押すまたは送信ボタンをクリックする THEN THE System SHALL そのメッセージをChat_Interfaceに表示し、API_Gatewayに送信する
2. WHEN API_GatewayがLLM_Providerからレスポンスを受信する THEN THE System SHALL ストリーミング形式でChat_Interfaceにレスポンスを表示する
3. WHEN ストリーミングレスポンスが進行中である THEN THE System SHALL 受信したテキストを逐次的にChat_Interfaceに追加表示する
4. WHEN ストリーミングレスポンスが完了する THEN THE System SHALL 完全なメッセージをMessage_Storeに保存する
5. WHEN メッセージ送信中にエラーが発生する THEN THE System SHALL エラーメッセージをChat_Interfaceに表示し、ユーザーに再試行を促す

### 要件2: LLMモデルの選択

**ユーザーストーリー:** ユーザーとして、複数のLLMモデルから選択したい。そうすることで、用途に応じて最適なモデルを使用できる。

#### 受入基準

1. WHEN ユーザーがChat_Interfaceにアクセスする THEN THE System SHALL 利用可能なLLMモデルのリスト（GPT-4o、GPT-4o-mini、Claude 4.5 Sonnet、Claude 4.5 Haiku）をModel_Selectorに表示する
2. WHEN ユーザーがModel_Selectorからモデルを選択する THEN THE System SHALL 選択されたモデルを現在のChat_Sessionに適用する
3. WHEN メッセージが送信される THEN THE System SHALL 現在選択されているモデルを使用してLLM_Providerにリクエストを送信する
4. WHEN モデルが変更される THEN THE System SHALL 新しいモデル選択をChat_Interfaceに視覚的に反映する

### 要件3: チャット履歴の永続化

**ユーザーストーリー:** システム管理者として、チャット履歴をデータベースに保存したい。そうすることで、将来的な機能拡張（履歴の読み込みなど）に備えられる。

#### 受入基準

1. WHEN ユーザーメッセージが送信される THEN THE System SHALL そのメッセージをMessage_Storeに保存する
2. WHEN LLMからの完全なレスポンスが受信される THEN THE System SHALL そのレスポンスをMessage_Storeに保存する
3. WHEN メッセージを保存する THEN THE System SHALL タイムスタンプ、送信者（user/assistant）、メッセージ内容、使用モデルを含める
4. WHEN データベース書き込みエラーが発生する THEN THE System SHALL エラーをログに記録し、ユーザーには通常通りチャットを継続させる

### 要件4: ストリーミングレスポンスの実装

**ユーザーストーリー:** ユーザーとして、LLMの回答をリアルタイムで見たい。そうすることで、長い回答でも待ち時間を感じずに読み始められる。

#### 受入基準

1. WHEN API_GatewayがLLM_Providerにリクエストを送信する THEN THE System SHALL Server-Sent Events（SSE）を使用してストリーミング接続を確立する
2. WHEN LLM_Providerがトークンを生成する THEN THE System SHALL 各トークンを即座にChat_Interfaceに送信する
3. WHEN Chat_InterfaceがSSEイベントを受信する THEN THE System SHALL 受信したテキストを現在のメッセージに追加表示する
4. WHEN ストリーミングが完了する THEN THE System SHALL SSE接続を適切にクローズする
5. WHEN ストリーミング中に接続エラーが発生する THEN THE System SHALL エラーを検出し、ユーザーに通知する

### 要件5: APIキーの管理

**ユーザーストーリー:** システム管理者として、APIキーをサーバー側で安全に管理したい。そうすることで、クライアント側にAPIキーを露出させずにセキュリティを確保できる。

#### 受入基準

1. WHEN API_Gatewayが起動する THEN THE System SHALL 環境変数からOpenAIとClaudeのAPIキーを読み込む
2. WHEN 必要なAPIキーが環境変数に設定されていない THEN THE System SHALL 起動時にエラーメッセージを表示し、起動を中止する
3. WHEN LLM_Providerにリクエストを送信する THEN THE System SHALL 適切なAPIキーをリクエストヘッダーに含める
4. THE System SHALL APIキーをクライアント側に送信しない

### 要件6: 統一されたLLM APIインターフェース

**ユーザーストーリー:** 開発者として、OpenAIとClaudeの異なるAPIを統一的に扱いたい。そうすることで、コードの保守性と拡張性を向上できる。

#### 受入基準

1. WHEN API_Gatewayが異なるLLM_Providerにリクエストを送信する THEN THE System SHALL 統一されたインターフェースを通じて処理する
2. WHEN OpenAI APIを呼び出す THEN THE System SHALL OpenAI固有のリクエスト形式に変換する
3. WHEN Claude APIを呼び出す THEN THE System SHALL Claude固有のリクエスト形式に変換する
4. WHEN いずれかのLLM_Providerからレスポンスを受信する THEN THE System SHALL 統一された形式でChat_Interfaceに返す
5. WHEN 新しいLLM_Providerを追加する THEN THE System SHALL 既存のコードへの影響を最小限に抑えられる設計である

### 要件7: エラーハンドリング

**ユーザーストーリー:** ユーザーとして、エラーが発生した際に適切なフィードバックを受け取りたい。そうすることで、問題を理解し、適切に対処できる。

#### 受入基準

1. WHEN LLM_Provider APIがレート制限エラーを返す THEN THE System SHALL ユーザーに「リクエストが多すぎます。しばらく待ってから再試行してください」と表示する
2. WHEN LLM_Provider APIが認証エラーを返す THEN THE System SHALL エラーをログに記録し、ユーザーに「サービスに接続できません」と表示する
3. WHEN ネットワークエラーが発生する THEN THE System SHALL ユーザーに「ネットワークエラーが発生しました。接続を確認してください」と表示する
4. WHEN 予期しないエラーが発生する THEN THE System SHALL エラーの詳細をサーバーログに記録し、ユーザーには一般的なエラーメッセージを表示する
5. WHEN エラーが発生する THEN THE System SHALL ユーザーがメッセージを再送信できる状態を維持する

### 要件8: ユーザーインターフェース

**ユーザーストーリー:** ユーザーとして、直感的で使いやすいチャットインターフェースを使いたい。そうすることで、スムーズに生成AIと対話できる。

#### 受入基準

1. WHEN ユーザーがChat_Interfaceにアクセスする THEN THE System SHALL メッセージ表示エリア、入力フィールド、送信ボタン、Model_Selectorを表示する
2. WHEN 新しいメッセージが追加される THEN THE System SHALL 自動的に最新のメッセージまでスクロールする
3. WHEN メッセージが送信中である THEN THE System SHALL 送信ボタンを無効化し、ローディングインジケーターを表示する
4. WHEN 入力フィールドが空である THEN THE System SHALL 送信ボタンを無効化する
5. WHEN ユーザーメッセージとLLMレスポンスを表示する THEN THE System SHALL 視覚的に区別できるようにスタイリングする

### 要件9: プロジェクト構成とセットアップ

**ユーザーストーリー:** 開発者として、プロジェクトを簡単にセットアップして実行したい。そうすることで、開発を迅速に開始できる。

#### 受入基準

1. THE System SHALL uvを使用してPythonの依存関係を管理する
2. THE System SHALL FastAPIをバックエンドフレームワークとして使用する
3. THE System SHALL React + TypeScriptをフロントエンドフレームワークとして使用する
4. THE System SHALL SQLiteをデータベースとして使用する
5. WHEN 開発者がプロジェクトをセットアップする THEN THE System SHALL 必要な依存関係のインストールと環境設定の手順を提供する
6. WHEN 開発者がアプリケーションを起動する THEN THE System SHALL バックエンドとフロントエンドが正常に起動し、相互に通信できる
