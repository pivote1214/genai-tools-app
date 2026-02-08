/**
 * ChatServiceのユニットテスト
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ChatService } from '../../src/services/ChatService';
import type { ModelInfo } from '../../src/types';

const API_BASE_URL = 'http://localhost:8000';
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ChatService', () => {
  describe('sendMessage', () => {
    it('ストリーミング応答を処理する', async () => {
      const chunks = [
        'data: {"content":"Hello"}\n\n',
        'data: {"content":" world"}\n\n',
        'data: {"done":true}\n\n',
      ];

      server.use(
        http.post(`${API_BASE_URL}/api/chat`, () => {
          const stream = new ReadableStream({
            start(controller) {
              chunks.forEach((chunk) => {
                controller.enqueue(new TextEncoder().encode(chunk));
              });
              controller.close();
            },
          });

          return new HttpResponse(stream, {
            headers: { 'Content-Type': 'text/event-stream' },
          });
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await chatService.sendMessage('Test message', 'gpt-4o', [], 'conv-1', onChunk, onComplete, onError);

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('リクエストペイロードにconversation_idを含める', async () => {
      let requestBody: any = null;

      server.use(
        http.post(`${API_BASE_URL}/api/chat`, async ({ request }) => {
          requestBody = await request.json();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('data: {"done":true}\n\n'));
              controller.close();
            },
          });
          return new HttpResponse(stream, {
            headers: { 'Content-Type': 'text/event-stream' },
          });
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const history = [{ role: 'user', content: 'Previous message' }];

      await chatService.sendMessage('New message', 'gpt-4o', history, 'conv-1', vi.fn(), vi.fn(), vi.fn());

      expect(requestBody).toEqual({
        conversation_id: 'conv-1',
        message: 'New message',
        model: 'gpt-4o',
        history,
      });
    });
  });

  describe('getModels', () => {
    it('モデル一覧を取得する', async () => {
      const mockModels: ModelInfo[] = [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          description: 'OpenAI model',
        },
      ];

      server.use(
        http.get(`${API_BASE_URL}/api/models`, () => HttpResponse.json(mockModels))
      );

      const chatService = new ChatService(API_BASE_URL);
      const models = await chatService.getModels();

      expect(models).toEqual(mockModels);
    });
  });

  describe('conversation APIs', () => {
    it('会話一覧を取得する', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/conversations`, () =>
          HttpResponse.json([
            {
              id: 'conv-1',
              title: '会話',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              message_count: 1,
              last_message_preview: 'hello',
            },
          ])
        )
      );

      const chatService = new ChatService(API_BASE_URL);
      const conversations = await chatService.getConversations();

      expect(conversations[0].id).toBe('conv-1');
    });

    it('会話を作成する', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/conversations`, () =>
          HttpResponse.json({
            id: 'conv-new',
            title: '新しいチャット',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          })
        )
      );

      const chatService = new ChatService(API_BASE_URL);
      const result = await chatService.createConversation();

      expect(result.id).toBe('conv-new');
    });
  });
});
