import { ModelInfo } from '../types';
import './MessageInput.css';

interface MessageInputProps {
  value: string;
  selectedModel: string;
  availableModels: ModelInfo[];
  isLoading: boolean;
  onSend: (message: string) => void;
  onChange: (value: string) => void;
  onModelChange: (model: string) => void;
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSend(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className="input-controls">
        <select
          className="model-selector"
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
      <div className="input-row">
        <textarea
          className="message-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          disabled={isLoading}
          rows={3}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? (
            <span className="loading-indicator">送信中...</span>
          ) : (
            '送信'
          )}
        </button>
      </div>
    </form>
  );
}
