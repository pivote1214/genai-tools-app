import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../../src/components/ChatInterface';
import { chatService } from '../../src/services/ChatService';
import type { ConversationMessage, ConversationSummary, ModelInfo } from '../../src/types';

vi.mock('../../src/services/ChatService', () => ({
  chatService: {
    getModels: vi.fn(),
    getConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversationMessages: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

describe('ChatInterface', () => {
  const mockModels: ModelInfo[] = [
    { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', description: 'Test model' },
  ];

  const mockConversations: ConversationSummary[] = [
    {
      id: 'conv-1',
      title: 'テスト会話',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      message_count: 2,
      last_message_preview: 'hello',
    },
  ];

  const mockMessages: ConversationMessage[] = [
    {
      id: 1,
      conversation_id: 'conv-1',
      role: 'user',
      content: 'hello',
      model: 'gpt-5.2',
      timestamp: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    vi.mocked(chatService.getModels).mockResolvedValue(mockModels);
    vi.mocked(chatService.getConversations).mockResolvedValue(mockConversations);
    vi.mocked(chatService.getConversationMessages).mockResolvedValue(mockMessages);
    vi.mocked(chatService.createConversation).mockResolvedValue({
      id: 'conv-new',
      title: '新しいチャット',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });

  it('初期表示時にモデルと会話一覧を取得する', async () => {
    render(<ChatInterface />);
    await waitFor(() => {
      expect(chatService.getModels).toHaveBeenCalled();
      expect(chatService.getConversations).toHaveBeenCalled();
    });
  });

  it('履歴サイドバーに会話が表示される', async () => {
    render(<ChatInterface />);
    await waitFor(() => {
      expect(screen.getByText('チャット履歴')).toBeInTheDocument();
      expect(screen.getByText('テスト会話')).toBeInTheDocument();
    });
  });

  it('新しいチャットボタンで会話を作成する', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '新しいチャット' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新しいチャット' }));

    await waitFor(() => {
      expect(chatService.createConversation).toHaveBeenCalled();
    });
  });

  it('メッセージ送信時にconversationIdを含めて送信する', async () => {
    vi.mocked(chatService.sendMessage).mockImplementation(
      async (_msg, _model, _history, _conversationId, onChunk, onComplete) => {
        onChunk('Response');
        onComplete();
      }
    );

    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('メッセージを入力...'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: /送信/ }));

    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalled();
    });

    const call = vi.mocked(chatService.sendMessage).mock.calls[0];
    expect(call[3]).toBe('conv-1');
  });
});
