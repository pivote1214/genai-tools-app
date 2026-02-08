import { useCallback, useEffect, useState } from 'react';
import type { ConversationResponse, ConversationSummary, Message, ModelInfo } from '../types';
import { chatService } from '../services/ChatService';
import { ConversationSidebar } from './ConversationSidebar';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import './ChatInterface.css';

function toSummary(conversation: ConversationResponse): ConversationSummary {
  return {
    ...conversation,
    message_count: 0,
    last_message_preview: '',
  };
}

function parseConversationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function moveConversationToTop(
  conversations: ConversationSummary[],
  conversationId: string,
  titleCandidate: string,
  preview: string,
  incrementBy: number
): ConversationSummary[] {
  const current = conversations.find((item) => item.id === conversationId);
  const now = new Date().toISOString();
  const nextItem: ConversationSummary = {
    id: conversationId,
    title:
      current && current.title !== '新しいチャット'
        ? current.title
        : titleCandidate || current?.title || '新しいチャット',
    created_at: current?.created_at ?? now,
    updated_at: now,
    message_count: (current?.message_count ?? 0) + incrementBy,
    last_message_preview: preview || current?.last_message_preview || '',
  };

  return [nextItem, ...conversations.filter((item) => item.id !== conversationId)];
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const navigateToConversation = useCallback((conversationId: string, replace = false) => {
    const url = `/chat/${encodeURIComponent(conversationId)}`;
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const summaries = await chatService.getConversations();
      setConversations(summaries);
    } catch {
      // 会話一覧取得の失敗は致命ではないため無視
    }
  }, []);

  const loadConversation = useCallback(
    async (conversationId: string, replaceUrl = false) => {
      setActiveConversationId(conversationId);
      if (window.location.pathname !== `/chat/${encodeURIComponent(conversationId)}`) {
        navigateToConversation(conversationId, replaceUrl);
      }

      try {
        const apiMessages = await chatService.getConversationMessages(conversationId);
        setMessages(
          apiMessages.map((msg) => ({
            id: String(msg.id),
            role: msg.role,
            content: msg.content,
            model: msg.model,
            timestamp: new Date(msg.timestamp),
            conversationId: msg.conversation_id,
          }))
        );
      } catch {
        setMessages([]);
      }
    },
    [navigateToConversation]
  );

  const createConversation = useCallback(async () => {
    const created = await chatService.createConversation('新しいチャット');
    const summary = toSummary(created);
    setConversations((prev) => [summary, ...prev.filter((item) => item.id !== created.id)]);
    setMessages([]);
    setActiveConversationId(created.id);
    navigateToConversation(created.id);
    return created.id;
  }, [navigateToConversation]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const models = await chatService.getModels();
        setAvailableModels(models);
        if (models.length > 0) {
          setSelectedModel(models[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'モデル情報の取得に失敗しました');
      }

      try {
        const summaries = await chatService.getConversations();
        setConversations(summaries);

        const fromPath = parseConversationIdFromPath(window.location.pathname);
        if (fromPath) {
          await loadConversation(fromPath, true);
          return;
        }

        if (summaries.length > 0) {
          await loadConversation(summaries[0].id, true);
          return;
        }
      } catch {
        // フォールバックとしてローカル会話IDを採用
      }

      const fallbackId = `local-${Date.now()}`;
      setActiveConversationId(fallbackId);
      navigateToConversation(fallbackId, true);
      setMessages([]);
    };

    fetchInitialData();
  }, [loadConversation, navigateToConversation]);

  useEffect(() => {
    const onPopState = () => {
      const fromPath = parseConversationIdFromPath(window.location.pathname);
      if (fromPath) {
        void loadConversation(fromPath, true);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadConversation]);

  const handleSelectConversation = async (conversationId: string) => {
    setError(null);
    await loadConversation(conversationId);
  };

  const handleCreateConversation = async () => {
    setError(null);
    try {
      await createConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : '新しいチャットの作成に失敗しました');
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const conversationId = activeConversationId ?? `local-${Date.now()}`;
    if (!activeConversationId) {
      setActiveConversationId(conversationId);
      navigateToConversation(conversationId);
    }

    const now = Date.now();
    const userMessage: Message = {
      id: `user-${now}`,
      role: 'user',
      content: message,
      model: selectedModel,
      timestamp: new Date(),
      conversationId,
    };

    const assistantMessageId = `assistant-${now}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      timestamp: new Date(),
      conversationId,
    };

    const history = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setConversations((prev) => moveConversationToTop(prev, conversationId, message.slice(0, 40), message, 1));
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      await chatService.sendMessage(
        message,
        selectedModel,
        history,
        conversationId,
        (content: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: msg.content + content } : msg
            )
          );
        },
        () => {
          setConversations((prev) =>
            moveConversationToTop(prev, conversationId, message.slice(0, 40), message, 1)
          );
          setIsLoading(false);
          void refreshConversations();
        },
        (errorMessage: string) => {
          setError(errorMessage);
          setIsLoading(false);
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
    <div className="chat-layout">
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleCreateConversation}
      />

      <div className="chat-interface">
        <div className="chat-header">
          <h1>AI Chat</h1>
        </div>
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button className="error-close" onClick={() => setError(null)} aria-label="エラーを閉じる">
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
    </div>
  );
}
