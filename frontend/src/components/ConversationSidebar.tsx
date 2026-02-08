import type { ConversationSummary } from '../types'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onCreateConversation: () => void
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
}: ConversationSidebarProps) {
  return (
    <aside className="glass-panel noise-overlay animate-riseIn relative flex h-[34vh] min-h-[250px] w-full flex-col overflow-hidden rounded-2xl md:h-auto md:min-h-0 md:w-[340px] md:rounded-3xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-400/70 to-transparent" />
      <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-4 md:px-5">
        <h2 className="text-sm font-bold tracking-[0.16em] text-ink-100/90">チャット履歴</h2>
        <button
          className="rounded-full border border-accent-500/70 bg-accent-500/90 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-ink-950 transition duration-200 hover:-translate-y-0.5 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500/60"
          onClick={onCreateConversation}
          type="button"
        >
          新しいチャット
        </button>
      </div>
      <ul className="conversation-list flex-1 space-y-2 overflow-y-auto p-3 md:p-4">
        {conversations.map((conversation, index) => {
          const isActive = activeConversationId === conversation.id
          return (
            <li key={conversation.id} className="animate-riseIn" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <button
                className={`conversation-item w-full rounded-xl border px-3 py-3 text-left transition duration-200 md:px-4 ${
                  isActive
                    ? 'active border-signal-400/70 bg-signal-500/15 shadow-[0_0_0_1px_rgb(45_212_191_/_0.22)]'
                    : 'border-ink-700/75 bg-ink-800/55 hover:border-accent-500/70 hover:bg-ink-800/80'
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                type="button"
              >
                <span className="conversation-title block text-sm font-semibold text-ink-50">{conversation.title}</span>
                <span className="conversation-preview mt-1 block overflow-hidden text-xs leading-relaxed text-ink-100/75 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {conversation.last_message_preview || 'メッセージはまだありません'}
                </span>
                <span className="conversation-updated mt-2 block font-mono text-[11px] text-ink-100/55">
                  {formatUpdatedAt(conversation.updated_at)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
