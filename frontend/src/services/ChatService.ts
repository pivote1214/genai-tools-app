/**
 * ChatService - バックエンドAPIとの通信を担当するサービスクラス
 */

import { ModelInfo } from '../types';

/**
 * APIのベースURL（環境変数から取得、デフォルトはlocalhost）
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * ストリーミングチャンクの型
 */
interface StreamChunk {
  content?: string;
  error?: string;
  done?: boolean;
}

/**
 * ChatServiceクラス
 * バックエンドAPIとの通信を管理し、SSEストリーミングとモデル情報の取得を提供
 */
export class ChatService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * チャットメッセージを送信し、ストリーミングレスポンスを受信
   * 
   * @param message - 送信するメッセージ
   * @param model - 使用するLLMモデル
   * @param history - 会話履歴
   * @param onChunk - チャンクを受信したときのコールバック
   * @param onComplete - ストリーミング完了時のコールバック
   * @param onError - エラー発生時のコールバック
   */
  async sendMessage(
    message: string,
    model: string,
    history: Array<{ role: string; content: string }>,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          model,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // SSEストリーミングの処理
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));
              
              if (data.error) {
                onError(data.error);
                return;
              }
              
              if (data.content) {
                onChunk(data.content);
              }
              
              if (data.done) {
                onComplete();
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      if (error instanceof TypeError) {
        // ネットワークエラー
        onError('ネットワークエラーが発生しました。接続を確認してください');
      } else if (error instanceof Error) {
        onError(error.message);
      } else {
        onError('メッセージの送信に失敗しました');
      }
    }
  }

  /**
   * 利用可能なLLMモデルのリストを取得
   * 
   * @returns モデル情報の配列
   * @throws ネットワークエラーまたはHTTPエラー
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const models: ModelInfo[] = await response.json();
      return models;
    } catch (error) {
      if (error instanceof TypeError) {
        // ネットワークエラー
        throw new Error('ネットワークエラーが発生しました。接続を確認してください');
      } else if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('モデル情報の取得に失敗しました');
      }
    }
  }
}

/**
 * デフォルトのChatServiceインスタンス
 */
export const chatService = new ChatService();
