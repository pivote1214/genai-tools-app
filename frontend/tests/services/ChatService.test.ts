/**
 * ChatServiceのユニットテスト
 * MSWを使用してAPIモックを作成し、ストリーミングレスポンスとエラーハンドリングを検証
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ChatService } from '../../src/services/ChatService';
import { ModelInfo } from '../../src/types';

const API_BASE_URL = 'http://localhost:8000';

// MSWサーバーのセットアップ
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ChatService', () => {
  describe('sendMessage', () => {
    it('should receive streaming response and call onChunk for each chunk', async () => {
      // ストリーミングレスポンスのモック
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
            headers: {
              'Content-Type': 'text/event-stream',
            },
          });
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await chatService.sendMessage(
        'Test message',
        'gpt-5.2',
        [],
        onChunk,
        onComplete,
        onError
      );

      // 検証: 要件 1.2, 1.3, 4.3
      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello');
      expect(onChunk).toHaveBeenNthCalledWith(2, ' world');
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should call onError when server returns error in stream', async () => {
      const errorMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください';
      
      server.use(
        http.post(`${API_BASE_URL}/api/chat`, () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(`data: {"error":"${errorMessage}"}\n\n`)
              );
              controller.close();
            },
          });

          return new HttpResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
            },
          });
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await chatService.sendMessage(
        'Test message',
        'gpt-5.2',
        [],
        onChunk,
        onComplete,
        onError
      );

      // 検証: 要件 7.3
      expect(onError).toHaveBeenCalledWith(errorMessage);
      expect(onChunk).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/chat`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await chatService.sendMessage(
        'Test message',
        'gpt-5.2',
        [],
        onChunk,
        onComplete,
        onError
      );

      // 検証: 要件 7.3
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toContain('HTTP error');
    });

    it('should handle network errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/chat`, () => {
          return HttpResponse.error();
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await chatService.sendMessage(
        'Test message',
        'gpt-5.2',
        [],
        onChunk,
        onComplete,
        onError
      );

      // 検証: 要件 7.3 - ネットワークエラー
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toContain('ネットワークエラー');
    });

    it('should send correct request payload', async () => {
      let requestBody: any = null;

      server.use(
        http.post(`${API_BASE_URL}/api/chat`, async ({ request }) => {
          requestBody = await request.json();
          
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode('data: {"content":"Response"}\n\n')
              );
              controller.enqueue(
                new TextEncoder().encode('data: {"done":true}\n\n')
              );
              controller.close();
            },
          });

          return new HttpResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
            },
          });
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const history = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
      ];

      await chatService.sendMessage(
        'New message',
        'gpt-5.2',
        history,
        vi.fn(),
        vi.fn(),
        vi.fn()
      );

      // 検証: 要件 1.1
      expect(requestBody).toEqual({
        message: 'New message',
        model: 'gpt-5.2',
        history,
      });
    });
  });

  describe('getModels', () => {
    it('should fetch and return model list', async () => {
      const mockModels: ModelInfo[] = [
        {
          id: 'gpt-5.2',
          name: 'GPT-5.2',
          provider: 'openai',
          description: 'OpenAI GPT-5.2 model',
        },
        {
          id: 'claude-sonnet-4.5',
          name: 'Claude Sonnet 4.5',
          provider: 'claude',
          description: 'Anthropic Claude Sonnet 4.5',
        },
      ];

      server.use(
        http.get(`${API_BASE_URL}/api/models`, () => {
          return HttpResponse.json(mockModels);
        })
      );

      const chatService = new ChatService(API_BASE_URL);
      const models = await chatService.getModels();

      // 検証: 要件 2.1
      expect(models).toEqual(mockModels);
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('gpt-5.2');
      expect(models[1].id).toBe('claude-sonnet-4.5');
    });

    it('should handle HTTP errors when fetching models', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/models`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const chatService = new ChatService(API_BASE_URL);

      // 検証: 要件 7.3
      await expect(chatService.getModels()).rejects.toThrow('HTTP error');
    });

    it('should handle network errors when fetching models', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/models`, () => {
          return HttpResponse.error();
        })
      );

      const chatService = new ChatService(API_BASE_URL);

      // 検証: 要件 7.3 - ネットワークエラー
      await expect(chatService.getModels()).rejects.toThrow('ネットワークエラー');
    });
  });
});
