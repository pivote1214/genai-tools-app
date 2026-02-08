/**
 * 統合テスト - チャットフロー全体の動作を検証
 * 
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { ChatInterface } from '../../src/components/ChatInterface';

// モックサーバーのセットアップ
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Chat Integration Tests', () => {
  it('完全なチャットフローの動作を検証 (要件: 1.1, 1.2, 1.3, 1.4)', async () => {
    // モックAPIのセットアップ
    server.use(
      http.get('http://localhost:8000/api/models', () => {
        return HttpResponse.json([
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            description: 'OpenAIの最新モデル'
          },
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'openai',
            description: 'OpenAIの軽量モデル'
          }
        ]);
      }),
      http.post('http://localhost:8000/api/chat', async () => {
        // ストリーミングレスポンスをシミュレート
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            // チャンクを順次送信
            const chunks = [
              'data: {"content":"Hello"}\n\n',
              'data: {"content":" "}\n\n',
              'data: {"content":"World"}\n\n',
              'data: {"content":"!"}\n\n',
              'data: {"done":true}\n\n'
            ];
            
            for (const chunk of chunks) {
              await delay(50); // 50msの遅延をシミュレート
              controller.enqueue(encoder.encode(chunk));
            }
            
            controller.close();
          }
        });
        
        return new HttpResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );
    
    // コンポーネントをレンダリング
    render(<ChatInterface />);
    
    // モデルが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    // 入力フィールドとボタンを取得
    const input = screen.getByPlaceholderText(/メッセージを入力/i);
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    // 初期状態では送信ボタンが無効
    expect(sendButton).toBeDisabled();
    
    // メッセージを入力
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // 送信ボタンが有効になる
    expect(sendButton).not.toBeDisabled();
    
    // メッセージを送信
    fireEvent.click(sendButton);
    
    // ユーザーメッセージが表示されることを確認 (要件: 1.1)
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
    
    // ストリーミングレスポンスが逐次的に表示されることを確認 (要件: 1.2, 1.3)
    await waitFor(() => {
      expect(screen.getByText(/Hello World!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 入力フィールドがクリアされることを確認
    expect(input).toHaveValue('');
  });
  
  it('ストリーミングレスポンスの受信と表示を検証 (要件: 1.2, 1.3)', async () => {
    let chunkCount = 0;
    
    server.use(
      http.get('http://localhost:8000/api/models', () => {
        return HttpResponse.json([
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            description: 'OpenAIの最新モデル'
          }
        ]);
      }),
      http.post('http://localhost:8000/api/chat', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const chunks = ['Test', ' ', 'streaming', ' ', 'response'];
            
            for (const chunk of chunks) {
              await delay(100);
              controller.enqueue(encoder.encode(`data: {"content":"${chunk}"}\n\n`));
              chunkCount++;
            }
            
            controller.enqueue(encoder.encode('data: {"done":true}\n\n'));
            controller.close();
          }
        });
        
        return new HttpResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );
    
    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText(/メッセージを入力/i);
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    // ストリーミングが完了するまで待機
    await waitFor(() => {
      expect(screen.getByText(/Test streaming response/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 複数のチャンクが送信されたことを確認
    expect(chunkCount).toBeGreaterThan(1);
  });
  
  it('エラーハンドリングを検証 (要件: 1.5)', async () => {
    server.use(
      http.get('http://localhost:8000/api/models', () => {
        return HttpResponse.json([
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            description: 'OpenAIの最新モデル'
          }
        ]);
      }),
      http.post('http://localhost:8000/api/chat', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // エラーレスポンスを送信
            controller.enqueue(encoder.encode('data: {"error":"ネットワークエラーが発生しました。接続を確認してください"}\n\n'));
            controller.close();
          }
        });
        
        return new HttpResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );
    
    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText(/メッセージを入力/i);
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/ネットワークエラーが発生しました/i)).toBeInTheDocument();
    });
    
    // ユーザーが再試行できる状態が維持されることを確認
    // 入力フィールドが有効であることを確認
    expect(input).not.toBeDisabled();
    
    // 新しいメッセージを入力すると送信ボタンが有効になることを確認
    fireEvent.change(input, { target: { value: 'Retry message' } });
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled();
    });
  });
  
  it('ネットワークエラー時のエラーハンドリングを検証 (要件: 1.5)', async () => {
    server.use(
      http.get('http://localhost:8000/api/models', () => {
        return HttpResponse.json([
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            description: 'OpenAIの最新モデル'
          }
        ]);
      }),
      http.post('http://localhost:8000/api/chat', () => {
        // ネットワークエラーをシミュレート
        return HttpResponse.error();
      })
    );
    
    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText(/メッセージを入力/i);
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/ネットワークエラーが発生しました/i)).toBeInTheDocument();
    });
  });
  
  it('モデル選択の動作を検証', async () => {
    server.use(
      http.get('http://localhost:8000/api/models', () => {
        return HttpResponse.json([
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            description: 'OpenAIの最新モデル'
          },
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'openai',
            description: 'OpenAIの軽量モデル'
          }
        ]);
      }),
      http.post('http://localhost:8000/api/chat', async ({ request }) => {
        const body = await request.json() as { model: string };
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: {"content":"Using model: ${body.model}"}\n\n`));
            controller.enqueue(encoder.encode('data: {"done":true}\n\n'));
            controller.close();
          }
        });
        
        return new HttpResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );
    
    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const modelSelect = screen.getByRole('combobox');
    const input = screen.getByPlaceholderText(/メッセージを入力/i);
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    // モデルを選択
    fireEvent.change(modelSelect, { target: { value: 'gpt-4o-mini' } });
    
    // メッセージを送信
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(sendButton);
    
    // 選択したモデルが使用されることを確認
    await waitFor(() => {
      expect(screen.getByText(/Using model: gpt-4o-mini/i)).toBeInTheDocument();
    });
  });
  
  it('会話履歴を含むチャットフローを検証', async () => {
    server.use(
      http.get('http://localhost:8000/api/models', () => {
        return HttpResponse.json([
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            description: 'OpenAIの最新モデル'
          }
        ]);
      }),
      http.post('http://localhost:8000/api/chat', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"content":"Second response"}\n\n'));
            controller.enqueue(encoder.encode('data: {"done":true}\n\n'));
            controller.close();
          }
        });
        
        return new HttpResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );
    
    render(<ChatInterface />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText(/メッセージを入力/i);
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    // 最初のメッセージを送信
    fireEvent.change(input, { target: { value: 'First message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
    });
    
    // 2番目のメッセージを送信
    fireEvent.change(input, { target: { value: 'Second message' } });
    fireEvent.click(sendButton);
    
    // 両方のメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Second response')).toBeInTheDocument();
    });
  });
});
