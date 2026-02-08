from abc import ABC, abstractmethod
from typing import AsyncIterator, List, Dict


class LLMProvider(ABC):
    """LLMプロバイダーの抽象基底クラス"""
    
    @abstractmethod
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str
    ) -> AsyncIterator[str]:
        """
        チャットメッセージをストリーミングで処理
        
        Args:
            messages: チャット履歴
            model: 使用するモデル名
            
        Yields:
            生成されたテキストのチャンク
        """
        pass
