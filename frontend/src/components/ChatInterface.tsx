import { useCallback, useEffect, useState } from 'react'
import type { ConversationResponse, ConversationSummary, Message, ModelInfo } from '../types'
import { chatService } from '../services/ChatService'
import { ConversationSidebar } from './ConversationSidebar'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'

function toSummary(conversation: ConversationResponse): ConversationSummary {
  return {
    ...conversation,
    message_count: 0,
    last_message_preview: '',
  }
}

function parseConversationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

function moveConversationToTop(
  conversations: ConversationSummary[],
  conversationId: string,
  titleCandidate: string,
  preview: string,
  incrementBy: number,
): ConversationSummary[] {
  const current = conversations.find((item) => item.id === conversationId)
  const now = new Date().toISOString()
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
  }

  return [nextItem, ...conversations.filter((item) => item.id !== conversationId)]
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null)

  const navigateToConversation = useCallback((conversationId: string, replace = false) => {
    const url = `/chat/${encodeURIComponent(conversationId)}`
    if (replace) {
      window.history.replaceState({}, '', url)
    } else {
      window.history.pushState({}, '', url)
    }
  }, [])

  const refreshConversations = useCallback(async () => {
    try {
      const summaries = await chatService.getConversations()
      setConversations(summaries)
    } catch {
      // 会話一覧取得の失敗は致命ではないため無視
    }
  }, [])

  const loadConversation = useCallback(
    async (conversationId: string, replaceUrl = false) => {
      setActiveConversationId(conversationId)
      if (window.location.pathname !== `/chat/${encodeURIComponent(conversationId)}`) {
        navigateToConversation(conversationId, replaceUrl)
      }

      try {
        const apiMessages = await chatService.getConversationMessages(conversationId)
        setMessages(
          apiMessages.map((msg) => ({
            id: String(msg.id),
            role: msg.role,
            content: msg.content,
            model: msg.model,
            timestamp: new Date(msg.timestamp),
            conversationId: msg.conversation_id,
          })),
        )
      } catch {
        setMessages([])
      }
    },
    [navigateToConversation],
  )

  const createConversation = useCallback(async () => {
    const created = await chatService.createConversation('新しいチャット')
    const summary = toSummary(created)
    setConversations((prev) => [summary, ...prev.filter((item) => item.id !== created.id)])
    setMessages([])
    setActiveConversationId(created.id)
    navigateToConversation(created.id)
    return created.id
  }, [navigateToConversation])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const models = await chatService.getModels()
        setAvailableModels(models)
        if (models.length > 0) {
          setSelectedModel(models[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'モデル情報の取得に失敗しました')
      }

      try {
        const summaries = await chatService.getConversations()
        setConversations(summaries)

        const fromPath = parseConversationIdFromPath(window.location.pathname)
        if (fromPath) {
          await loadConversation(fromPath, true)
          return
        }

        if (summaries.length > 0) {
          await loadConversation(summaries[0].id, true)
          return
        }
      } catch {
        // フォールバックとしてローカル会話IDを採用
      }

      const fallbackId = `local-${Date.now()}`
      setActiveConversationId(fallbackId)
      navigateToConversation(fallbackId, true)
      setMessages([])
    }

    fetchInitialData()
  }, [loadConversation, navigateToConversation])

  useEffect(() => {
    const onPopState = () => {
      const fromPath = parseConversationIdFromPath(window.location.pathname)
      if (fromPath) {
        void loadConversation(fromPath, true)
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [loadConversation])

  const handleSelectConversation = async (conversationId: string) => {
    setError(null)
    await loadConversation(conversationId)
  }

  const handleCreateConversation = async () => {
    setError(null)
    try {
      await createConversation()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新しいチャットの作成に失敗しました')
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (deletingConversationId) return

    setError(null)
    setDeletingConversationId(conversationId)

    try {
      await chatService.deleteConversation(conversationId)
      setConversations((prev) => prev.filter((item) => item.id !== conversationId))

      if (activeConversationId === conversationId) {
        await createConversation()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャット履歴の削除に失敗しました')
    } finally {
      setDeletingConversationId(null)
    }
  }

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return

    const conversationId = activeConversationId ?? `local-${Date.now()}`
    if (!activeConversationId) {
      setActiveConversationId(conversationId)
      navigateToConversation(conversationId)
    }

    const now = Date.now()
    const userMessage: Message = {
      id: `user-${now}`,
      role: 'user',
      content: message,
      model: selectedModel,
      timestamp: new Date(),
      conversationId,
    }

    const assistantMessageId = `assistant-${now}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      timestamp: new Date(),
      conversationId,
    }

    const history = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setConversations((prev) => moveConversationToTop(prev, conversationId, message.slice(0, 40), message, 1))
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      await chatService.sendMessage(
        message,
        selectedModel,
        history,
        conversationId,
        (content: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: msg.content + content } : msg,
            ),
          )
        },
        () => {
          setConversations((prev) =>
            moveConversationToTop(prev, conversationId, message.slice(0, 40), message, 1),
          )
          setIsLoading(false)
          void refreshConversations()
        },
        (errorMessage: string) => {
          setError(errorMessage)
          setIsLoading(false)
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId))
        },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メッセージの送信に失敗しました')
      setIsLoading(false)
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId))
    }
  }

  return (
    <div className="chat-layout relative min-h-screen w-full p-3 md:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-pulseBeam absolute -left-10 top-8 h-40 w-40 rounded-full bg-accent-500/10 blur-2xl" />
        <div className="animate-pulseBeam absolute bottom-8 right-6 h-48 w-48 rounded-full bg-signal-500/10 blur-3xl [animation-delay:700ms]" />
      </div>

      <div className="relative z-10 flex h-[calc(100vh-1.5rem)] flex-col gap-3 md:h-[calc(100vh-2.5rem)] md:flex-row md:gap-5">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          deletingConversationId={deletingConversationId}
          onSelectConversation={handleSelectConversation}
          onCreateConversation={handleCreateConversation}
          onDeleteConversation={(conversationId) => {
            void handleDeleteConversation(conversationId)
          }}
        />

        <main className="chat-interface glass-panel noise-overlay animate-riseIn relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl md:rounded-3xl">
          <div className="chat-header relative border-b border-ink-700/60 px-5 py-4 md:px-7 md:py-5">
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-500 via-accent-600 to-signal-500" />
            <p className="font-mono text-[11px] tracking-[0.22em] text-ink-100/55">GENAI WORKBENCH</p>
            <h1 className="mt-1 text-2xl font-black tracking-[0.06em] text-ink-50 md:text-3xl">AI Chat Console</h1>
          </div>

          {error && (
            <div className="error-banner mx-4 mt-4 flex items-start gap-3 rounded-xl border border-warning-500/35 bg-warning-100/95 px-3 py-3 text-warning-700 md:mx-6">
              <span className="error-icon text-base">⚠️</span>
              <span className="error-message flex-1 text-sm leading-relaxed">{error}</span>
              <button
                className="error-close rounded-md px-2 text-xl leading-none text-warning-700 transition hover:bg-warning-500/15"
                onClick={() => setError(null)}
                aria-label="エラーを閉じる"
                type="button"
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
        </main>
      </div>
    </div>
  )
}
