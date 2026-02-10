import os
from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from .llm_provider import LLMProvider


class ClaudeProvider(LLMProvider):
    """Claude APIの実装"""

    def __init__(self, api_key: str | None = None):
        """
        ClaudeProviderを初期化

        Args:
            api_key: Anthropic APIキー。Noneの場合は環境変数から読み込む
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set")
        self.client = AsyncAnthropic(api_key=self.api_key)

    def _convert_messages(
        self, messages: list[dict[str, str]]
    ) -> tuple[str | None, list[dict[str, str]]]:
        """
        OpenAI形式からClaude形式にメッセージを変換

        Args:
            messages: OpenAI形式のメッセージリスト

        Returns:
            (system_message, claude_messages)のタプル
        """
        system_message = None
        claude_messages = []

        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "system":
                # システムメッセージは別パラメータとして扱う
                system_message = content
            elif role in ("user", "assistant"):
                claude_messages.append({"role": role, "content": content})

        return system_message, claude_messages

    async def stream_chat(
        self, messages: list[dict[str, str]], model: str
    ) -> AsyncIterator[str]:
        """
        Claude APIを使用してストリーミングチャットを処理

        Args:
            messages: チャット履歴（OpenAI形式）
            model: 使用するモデル名

        Yields:
            生成されたテキストのチャンク
        """
        system_message, claude_messages = self._convert_messages(messages)

        # Claude APIのパラメータを構築
        params = {"model": model, "messages": claude_messages, "max_tokens": 4096}

        if system_message:
            params["system"] = system_message

        async with self.client.messages.stream(**params) as stream:
            async for text in stream.text_stream:
                yield text
