import os
from typing import AsyncIterator, List, Dict
from openai import AsyncOpenAI
from .llm_provider import LLMProvider


class OpenAIProvider(LLMProvider):
    """OpenAI APIの実装"""
    
    def __init__(self, api_key: str | None = None):
        """
        OpenAIProviderを初期化
        
        Args:
            api_key: OpenAI APIキー。Noneの場合は環境変数から読み込む
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not set")
        self.client = AsyncOpenAI(api_key=self.api_key)
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str
    ) -> AsyncIterator[str]:
        """
        OpenAI APIを使用してストリーミングチャットを処理
        
        Args:
            messages: チャット履歴
            model: 使用するモデル名
            
        Yields:
            生成されたテキストのチャンク
        """
        input_messages = [
            {
                "type": "message",
                "role": msg["role"],
                "content": msg["content"],
            }
            for msg in messages
            if msg.get("role") in ("user", "assistant", "system", "developer")
        ]

        async with self.client.responses.stream(
            model=model,
            input=input_messages,
        ) as stream:
            async for event in stream:
                if event.type == "response.output_text.delta":
                    yield event.delta
                elif event.type == "error":
                    raise RuntimeError(event.message)
