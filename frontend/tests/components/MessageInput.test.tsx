import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from '../../src/components/MessageInput';
import type { ModelInfo } from '../../src/types';

describe('MessageInput', () => {
  const mockModels: ModelInfo[] = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Test model' },
    { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'claude', description: 'Test model' },
  ];

  const defaultProps = {
    value: '',
    selectedModel: 'gpt-4o',
    availableModels: mockModels,
    isLoading: false,
    onSend: vi.fn(),
    onChange: vi.fn(),
    onModelChange: vi.fn(),
  };

  it('空入力時に送信ボタンが無効化される', () => {
    render(<MessageInput {...defaultProps} value="" />);
    const sendButton = screen.getByRole('button', { name: /送信/ });
    expect(sendButton).toBeDisabled();
  });

  it('テキスト入力時に送信ボタンが有効化される', () => {
    render(<MessageInput {...defaultProps} value="Hello" />);
    const sendButton = screen.getByRole('button', { name: /送信/ });
    expect(sendButton).not.toBeDisabled();
  });

  it('ローディング中に送信ボタンが無効化される', () => {
    render(<MessageInput {...defaultProps} value="Hello" isLoading={true} />);
    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
  });

  it('ローディング中にローディングインジケーターが表示される', () => {
    render(<MessageInput {...defaultProps} value="Hello" isLoading={true} />);
    expect(screen.getByText('送信中...')).toBeInTheDocument();
  });

  it('送信ボタンクリック時にonSendが呼ばれる', () => {
    const onSend = vi.fn();
    render(<MessageInput {...defaultProps} value="Hello" onSend={onSend} />);
    const sendButton = screen.getByRole('button', { name: /送信/ });
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('Enterキー押下時にonSendが呼ばれる', () => {
    const onSend = vi.fn();
    render(<MessageInput {...defaultProps} value="Hello" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('Shift+Enterキー押下時にonSendが呼ばれない', () => {
    const onSend = vi.fn();
    render(<MessageInput {...defaultProps} value="Hello" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('モデル選択時にonModelChangeが呼ばれる', () => {
    const onModelChange = vi.fn();
    render(<MessageInput {...defaultProps} onModelChange={onModelChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'claude-sonnet-4.5' } });
    expect(onModelChange).toHaveBeenCalledWith('claude-sonnet-4.5');
  });

  it('利用可能なモデルが全て表示される', () => {
    render(<MessageInput {...defaultProps} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument();
  });

  it('ローディング中にテキストエリアが無効化される', () => {
    render(<MessageInput {...defaultProps} isLoading={true} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    expect(textarea).toBeDisabled();
  });

  it('ローディング中にモデル選択が無効化される', () => {
    render(<MessageInput {...defaultProps} isLoading={true} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });
});
