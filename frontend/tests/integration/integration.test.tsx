/**
 * 統合テスト - 会話履歴込みのチャットフロー
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ChatInterface } from '../../src/components/ChatInterface';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Chat Integration Tests', () => {
  it('履歴取得後にチャット送信できる', async () => {
    server.use(
      http.get('http://localhost:8000/api/models', () =>
        HttpResponse.json([
          {
            id: 'gpt-5.2',
            name: 'GPT-5.2',
            provider: 'openai',
            description: 'OpenAIの最新モデル',
          },
        ])
      ),
      http.get('http://localhost:8000/api/conversations', () =>
        HttpResponse.json([
          {
            id: 'conv-1',
            title: 'テスト会話',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            message_count: 0,
            last_message_preview: '',
          },
        ])
      ),
      http.get('http://localhost:8000/api/conversations/conv-1/messages', () => HttpResponse.json([])),
      http.post('http://localhost:8000/api/chat', async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"content":"Hello"}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"content":" World"}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"done":true}\n\n'));
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );

    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/メッセージを入力/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/メッセージを入力/i), {
      target: { value: 'Hi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /送信/i }));

    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  it('履歴クリックで別会話に遷移する', async () => {
    server.use(
      http.get('http://localhost:8000/api/models', () =>
        HttpResponse.json([
          {
            id: 'gpt-5.2',
            name: 'GPT-5.2',
            provider: 'openai',
            description: 'OpenAIの最新モデル',
          },
        ])
      ),
      http.get('http://localhost:8000/api/conversations', () =>
        HttpResponse.json([
          {
            id: 'conv-1',
            title: '会話1',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            message_count: 1,
            last_message_preview: 'first',
          },
          {
            id: 'conv-2',
            title: '会話2',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T01:00:00Z',
            message_count: 1,
            last_message_preview: 'second',
          },
        ])
      ),
      http.get('http://localhost:8000/api/conversations/conv-1/messages', () =>
        HttpResponse.json([
          {
            id: 1,
            conversation_id: 'conv-1',
            role: 'user',
            content: 'first',
            model: 'gpt-5.2',
            timestamp: '2026-01-01T00:00:00Z',
          },
        ])
      ),
      http.get('http://localhost:8000/api/conversations/conv-2/messages', () =>
        HttpResponse.json([
          {
            id: 2,
            conversation_id: 'conv-2',
            role: 'assistant',
            content: 'second',
            model: 'gpt-5.2',
            timestamp: '2026-01-01T01:00:00Z',
          },
        ])
      )
    );

    render(<ChatInterface />);

    await waitFor(() => {
      expect(window.location.pathname).toContain('/chat/conv-1');
      expect(screen.getByText('会話2')).toBeInTheDocument();
    });

    const conversationTitle = screen.getByText('会話2');
    const conversationButton = conversationTitle.closest('button');
    expect(conversationButton).not.toBeNull();
    fireEvent.click(conversationButton!);

    await waitFor(() => {
      expect(window.location.pathname).toContain('/chat/conv-2');
    });
  });
});
