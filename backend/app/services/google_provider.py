import os
from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from .llm_provider import LLMProvider


class GoogleProvider(LLMProvider):
    """Google Gemini API(OpenAI互換)の実装"""

    def __init__(self, api_key: str | None = None):
        """
        GoogleProviderを初期化

        Args:
            api_key: Google APIキー。Noneの場合は環境変数から読み込む
        """
        self.api_key = (
            api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        )
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY is not set")

        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        model: str,
    ) -> AsyncIterator[str]:
        """
        Gemini API(OpenAI互換)を使用してストリーミングチャットを処理

        Args:
            messages: チャット履歴
            model: 使用するモデル名

        Yields:
            生成されたテキストのチャンク
        """
        stream = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
