import { useEffect, useRef } from 'react'
import type { Message } from '../types'
import { getModelDisplayName } from '../constants/modelDisplay'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="message-list relative flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 md:px-7">
      {messages.map((message, index) => {
        const isUser = message.role === 'user'
        return (
          <div
            key={message.id}
            className={`message animate-riseIn max-w-[92%] rounded-2xl border p-4 md:max-w-[78%] ${
              isUser
                ? 'message-user ml-auto border-accent-500/55 bg-gradient-to-br from-accent-600/90 to-accent-700/85 text-ink-50'
                : 'message-assistant mr-auto border-ink-700/75 bg-ink-800/65 text-ink-50'
            }`}
            style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
          >
            <div className="message-header mb-2 flex items-center justify-between gap-3">
              <span className="message-role text-sm font-bold tracking-[0.08em]">
                {isUser ? 'あなた' : 'アシスタント'}
              </span>
              <span className="message-model rounded-full border border-current/25 px-2 py-0.5 font-mono text-[11px] opacity-80">
                {getModelDisplayName(message.model)}
              </span>
            </div>
            <div className="message-content whitespace-pre-wrap break-words text-sm leading-relaxed md:text-[15px]">
              {message.content || (isUser ? '' : '...')}
            </div>
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}
