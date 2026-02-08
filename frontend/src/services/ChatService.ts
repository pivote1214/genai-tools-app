/**
 * ChatService - バックエンドAPIとの通信を担当するサービスクラス
 */

import type {
  ConversationMessage,
  ConversationResponse,
  ConversationSummary,
  ModelInfo,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface StreamChunk {
  content?: string;
  error?: string;
  done?: boolean;
}

export class ChatService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async sendMessage(
    message: string,
    model: string,
    history: Array<{ role: string; content: string }>,
    conversationId: string,
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
          conversation_id: conversationId,
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
        onError('ネットワークエラーが発生しました。接続を確認してください');
      } else if (error instanceof Error) {
        onError(error.message);
      } else {
        onError('メッセージの送信に失敗しました');
      }
    }
  }

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

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('ネットワークエラーが発生しました。接続を確認してください');
      } else if (error instanceof Error) {
        throw error;
      }
      throw new Error('モデル情報の取得に失敗しました');
    }
  }

  async createConversation(title: string = '新しいチャット'): Promise<ConversationResponse> {
    const response = await fetch(`${this.baseUrl}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getConversations(): Promise<ConversationSummary[]> {
    const response = await fetch(`${this.baseUrl}/api/conversations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    const response = await fetch(
      `${this.baseUrl}/api/conversations/${conversationId}/messages`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const chatService = new ChatService();
