/**
 * チャットアプリケーションの型定義
 */

/**
 * メッセージ型
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: Date;
  conversationId?: string;
}

/**
 * チャットリクエスト型
 */
export interface ChatRequest {
  conversation_id: string;
  message: string;
  model: string;
  history: Array<{ role: string; content: string }>;
}

/**
 * モデル情報型
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'google';
  description: string;
}

/**
 * 会話サマリー型
 */
export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string;
}

/**
 * 会話作成レスポンス型
 */
export interface ConversationResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * 会話メッセージ型
 */
export interface ConversationMessage {
  id: number;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: string;
}
