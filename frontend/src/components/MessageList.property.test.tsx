import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MessageList } from './MessageList';
import { Message } from '../types';
import * as fc from 'fast-check';

/**
 * Feature: ai-chat-mvp
 * Property 17: 自動スクロール
 * 
 * **Validates: 要件 8.2**
 * 
 * 任意の新しいメッセージ追加に対して、Chat_Interfaceが自動的に最新のメッセージまでスクロールすること
 */
describe('MessageList - Property-Based Tests', () => {
  it('プロパティ 17: 任意のメッセージ追加時に自動スクロールが呼ばれる', () => {
    fc.assert(
      fc.property(
        // メッセージの配列を生成
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            role: fc.constantFrom('user' as const, 'assistant' as const),
            content: fc.string({ minLength: 1 }),
            model: fc.constantFrom('gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4.5', 'claude-haiku-4.5'),
            timestamp: fc.date(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (messages: Message[]) => {
          // scrollIntoViewのモックを作成
          const scrollIntoViewMock = vi.fn();
          Element.prototype.scrollIntoView = scrollIntoViewMock;

          // 初期レンダリング
          const { rerender } = render(<MessageList messages={messages.slice(0, -1)} />);

          // モックをリセット
          scrollIntoViewMock.mockClear();

          // 新しいメッセージを追加してリレンダリング
          rerender(<MessageList messages={messages} />);

          // scrollIntoViewが呼ばれたことを確認
          expect(scrollIntoViewMock).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('プロパティ 17: 空のリストから最初のメッセージ追加時に自動スクロールが呼ばれる', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          role: fc.constantFrom('user' as const, 'assistant' as const),
          content: fc.string({ minLength: 1 }),
          model: fc.constantFrom('gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4.5', 'claude-haiku-4.5'),
          timestamp: fc.date(),
        }),
        (message: Message) => {
          // scrollIntoViewのモックを作成
          const scrollIntoViewMock = vi.fn();
          Element.prototype.scrollIntoView = scrollIntoViewMock;

          // 空のリストで初期レンダリング
          const { rerender } = render(<MessageList messages={[]} />);

          // モックをリセット
          scrollIntoViewMock.mockClear();

          // 最初のメッセージを追加
          rerender(<MessageList messages={[message]} />);

          // scrollIntoViewが呼ばれたことを確認
          expect(scrollIntoViewMock).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('プロパティ 17: 複数のメッセージを連続追加時に毎回自動スクロールが呼ばれる', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            role: fc.constantFrom('user' as const, 'assistant' as const),
            content: fc.string({ minLength: 1 }),
            model: fc.constantFrom('gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4.5', 'claude-haiku-4.5'),
            timestamp: fc.date(),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (messages: Message[]) => {
          // scrollIntoViewのモックを作成
          const scrollIntoViewMock = vi.fn();
          Element.prototype.scrollIntoView = scrollIntoViewMock;

          // 空のリストで初期レンダリング
          const { rerender } = render(<MessageList messages={[]} />);

          // 各メッセージを順番に追加
          for (let i = 0; i < messages.length; i++) {
            scrollIntoViewMock.mockClear();
            rerender(<MessageList messages={messages.slice(0, i + 1)} />);
            
            // 毎回scrollIntoViewが呼ばれることを確認
            expect(scrollIntoViewMock).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
