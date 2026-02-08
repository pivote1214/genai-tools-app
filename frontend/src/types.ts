/**
 * チャットアプリケーションの型定義
 */

/**
 * メッセージ型
 */
export interface Message {
  id: string;              // クライアント側で生成されるユニークID
  role: 'user' | 'assistant';
  content: string;
  model: string;           // 使用されたモデル名
  timestamp: Date;
}

/**
 * チャットリクエスト型
 */
export interface ChatRequest {
  message: string;
  model: string;
  history: Message[];      // 会話履歴（コンテキスト用）
}

/**
 * モデル情報型
 */
export interface ModelInfo {
  id: string;              // 例: 'gpt-5.2'
  name: string;            // 表示名: 'GPT-5.2'
  provider: 'openai' | 'claude';
  description: string;
}
