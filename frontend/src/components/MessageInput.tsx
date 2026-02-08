import type { ModelInfo } from '../types'

interface MessageInputProps {
  value: string
  selectedModel: string
  availableModels: ModelInfo[]
  isLoading: boolean
  onSend: (message: string) => void
  onChange: (value: string) => void
  onModelChange: (model: string) => void
}

export function MessageInput({
  value,
  selectedModel,
  availableModels,
  isLoading,
  onSend,
  onChange,
  onModelChange,
}: MessageInputProps) {
  const submitMessage = () => {
    if (value.trim() && !isLoading) {
      onSend(value)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return
    }

    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      submitMessage()
    }
  }

  return (
    <form className="message-input glass-panel noise-overlay m-3 rounded-2xl border-ink-700/80 p-3 md:m-5 md:p-4" onSubmit={handleSubmit}>
      <div className="input-controls mb-3 flex items-center justify-between gap-3">
        <label className="text-[11px] font-semibold tracking-[0.14em] text-ink-100" htmlFor="model-selector">
          MODEL
        </label>
        <select
          className="model-selector w-full max-w-[320px] rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 transition focus:border-signal-400 focus:outline-none focus:ring-2 focus:ring-signal-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          id="model-selector"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={isLoading}
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
      <div className="input-row flex items-end gap-2 md:gap-3">
        <textarea
          className="message-textarea min-h-[92px] flex-1 resize-y rounded-xl border border-ink-700 bg-ink-900 p-3 text-sm leading-relaxed text-ink-50 shadow-inner shadow-ink-950/45 transition placeholder:text-ink-100/70 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          disabled={isLoading}
          rows={3}
        />
        <button
          type="submit"
          className="send-button mb-1 inline-flex h-11 min-w-[102px] items-center justify-center rounded-xl border border-accent-500/80 bg-accent-500 px-4 font-semibold tracking-[0.08em] text-ink-950 transition duration-200 hover:-translate-y-0.5 hover:bg-accent-600 disabled:cursor-not-allowed disabled:border-ink-700 disabled:bg-ink-700 disabled:text-ink-100/70"
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? <span className="loading-indicator font-mono text-xs">送信中...</span> : '送信'}
        </button>
      </div>
    </form>
  )
}
