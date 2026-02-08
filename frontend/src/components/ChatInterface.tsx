import { useState, useEffect } from 'react';
import { Message, ModelInfo } from '../types';
import { chatService } from '../services/ChatService';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import './ChatInterface.css';

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モデル情報を取得
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await chatService.getModels();
        setAvailableModels(models);
        if (models.length > 0) {
          setSelectedModel(models[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'モデル情報の取得に失敗しました');
      }
    };

    fetchModels();
  }, []);

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      model: selectedModel,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // アシスタントメッセージの準備
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // 会話履歴を準備
    const history = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      await chatService.sendMessage(
        message,
        selectedModel,
        history,
        // onChunk: ストリーミングチャンクを受信
        (content: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + content }
                : msg
            )
          );
        },
        // onComplete: ストリーミング完了
        () => {
          setIsLoading(false);
        },
        // onError: エラー発生
        (errorMessage: string) => {
          setError(errorMessage);
          setIsLoading(false);
          // エラーメッセージを削除
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メッセージの送信に失敗しました');
      setIsLoading(false);
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>AI Chat</h1>
      </div>
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button
            className="error-close"
            onClick={() => setError(null)}
            aria-label="エラーを閉じる"
          >
            ×
          </button>
        </div>
      )}
      <MessageList messages={messages} />
      <MessageInput
        value={inputValue}
        selectedModel={selectedModel}
        availableModels={availableModels}
        isLoading={isLoading}
        onSend={handleSend}
        onChange={setInputValue}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
