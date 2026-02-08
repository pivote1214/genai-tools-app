import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList';
import { Message } from '../types';

describe('MessageList', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      model: 'gpt-4o',
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi there!',
      model: 'gpt-4o',
      timestamp: new Date('2024-01-01T10:00:05'),
    },
  ];

  it('メッセージが表示される', () => {
    render(<MessageList messages={mockMessages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('ユーザーメッセージとアシスタントメッセージが視覚的に区別される', () => {
    render(<MessageList messages={mockMessages} />);
    const userMessage = screen.getByText('Hello').closest('.message');
    const assistantMessage = screen.getByText('Hi there!').closest('.message');
    
    expect(userMessage).toHaveClass('message-user');
    expect(assistantMessage).toHaveClass('message-assistant');
  });

  it('メッセージの役割が表示される', () => {
    render(<MessageList messages={mockMessages} />);
    expect(screen.getByText('あなた')).toBeInTheDocument();
    expect(screen.getByText('アシスタント')).toBeInTheDocument();
  });

  it('使用されたモデル名が表示される', () => {
    render(<MessageList messages={mockMessages} />);
    const modelLabels = screen.getAllByText('gpt-4o');
    expect(modelLabels).toHaveLength(2);
  });

  it('空のメッセージリストが正しく表示される', () => {
    const { container } = render(<MessageList messages={[]} />);
    const messageList = container.querySelector('.message-list');
    expect(messageList).toBeInTheDocument();
    expect(messageList?.children.length).toBe(1); // スクロール用のdivのみ
  });
});
