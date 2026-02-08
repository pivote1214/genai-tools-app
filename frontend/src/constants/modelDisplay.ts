const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-5.2': 'GPT-5.2',
  'gpt-5.2-pro': 'GPT-5.2 Pro',
  'gemini-3-pro-preview': 'Gemini 3 Pro',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'claude-opus-4-5': 'Claude 4.5 Opus',
  'claude-sonnet-4-5': 'Claude 4.5 Sonnet',
  'claude-haiku-4-5': 'Claude 4.5 Haiku',
}

export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] ?? modelId
}
