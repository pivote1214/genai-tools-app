import type { ConversationSummary } from '../types';
import './ConversationSidebar.css';

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
}: ConversationSidebarProps) {
  return (
    <aside className="conversation-sidebar">
      <div className="conversation-sidebar-header">
        <h2>チャット履歴</h2>
        <button className="new-chat-button" onClick={onCreateConversation}>
          新しいチャット
        </button>
      </div>
      <ul className="conversation-list">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <button
              className={`conversation-item ${
                activeConversationId === conversation.id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
              type="button"
            >
              <span className="conversation-title">{conversation.title}</span>
              <span className="conversation-preview">
                {conversation.last_message_preview || 'メッセージはまだありません'}
              </span>
              <span className="conversation-updated">
                {formatUpdatedAt(conversation.updated_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
