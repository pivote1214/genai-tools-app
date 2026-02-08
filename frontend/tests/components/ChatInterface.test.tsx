import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../../src/components/ChatInterface';
import { chatService } from '../../src/services/ChatService';
import type { ModelInfo } from '../../src/types';

vi.mock('../../src/services/ChatService', () => ({
  chatService: {
    getModels: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

describe('ChatInterface', () => {
  const mockModels: ModelInfo[] = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Test model' },
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'claude', description: 'Test model' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'claude', description: 'Test model' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatService.getModels).mockResolvedValue(mockModels);
  });

  it('初期表示時にモデル情報を取得する', async () => {
    render(<ChatInterface />);
    await waitFor(() => {
      expect(chatService.getModels).toHaveBeenCalled();
    });
  });

  it('メッセージ送信後にユーザーメッセージが表示される', async () => {
    vi.mocked(chatService.sendMessage).mockImplementation(
      async (_msg, _model, _history, onChunk, onComplete) => {
        onChunk('Response');
        onComplete();
      }
    );

    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    const sendButton = screen.getByRole('button', { name: /送信/ });

    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  it('エラー発生時にエラーメッセージが表示される', async () => {
    const errorMessage = 'ネットワークエラーが発生しました';
    vi.mocked(chatService.sendMessage).mockImplementation(
      async (_msg, _model, _history, _onChunk, _onComplete, onError) => {
        onError(errorMessage);
      }
    );

    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    const sendButton = screen.getByRole('button', { name: /送信/ });

    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('エラーバナーの閉じるボタンでエラーが消える', async () => {
    const errorMessage = 'ネットワークエラーが発生しました';
    vi.mocked(chatService.sendMessage).mockImplementation(
      async (_msg, _model, _history, _onChunk, _onComplete, onError) => {
        onError(errorMessage);
      }
    );

    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    const sendButton = screen.getByRole('button', { name: /送信/ });

    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('エラーを閉じる');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  it('モデル選択が変更される', async () => {
    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'claude-sonnet-4-5' } });

    expect(select).toHaveValue('claude-sonnet-4-5');
  });

  it('ストリーミングレスポンスが逐次表示される', async () => {
    vi.mocked(chatService.sendMessage).mockImplementation(
      async (_msg, _model, _history, onChunk, onComplete) => {
        onChunk('Hello');
        onChunk(' World');
        onComplete();
      }
    );

    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    const sendButton = screen.getByRole('button', { name: /送信/ });

    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });
});
