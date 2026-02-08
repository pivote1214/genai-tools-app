import os
from typing import AsyncIterator, List, Dict
from .llm_provider import LLMProvider
from .openai_provider import OpenAIProvider
from .claude_provider import ClaudeProvider
from .google_provider import GoogleProvider


class LLMService:
    """LLMサービスのファサード"""
    
    def __init__(self):
        """LLMServiceを初期化"""
        # プロバイダーの初期化
        self.providers: Dict[str, LLMProvider] = {}
        
        # OpenAIプロバイダーの初期化（APIキーがある場合のみ）
        if os.getenv('OPENAI_API_KEY'):
            self.providers['openai'] = OpenAIProvider()
        
        # Claudeプロバイダーの初期化（APIキーがある場合のみ）
        if os.getenv('ANTHROPIC_API_KEY'):
            self.providers['claude'] = ClaudeProvider()

        # Googleプロバイダーの初期化（APIキーがある場合のみ）
        if os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY'):
            self.providers['google'] = GoogleProvider()
        
        # モデル名からプロバイダーへのマッピング
        self.model_mapping = {
            'gpt-5.2': 'openai',
            'gpt-5.2-pro': 'openai',
            'gemini-3-pro-preview': 'google',
            'gemini-3-flash-preview': 'google',
            'claude-opus-4-5': 'claude',
            'claude-sonnet-4-5': 'claude',
            'claude-haiku-4-5': 'claude'
        }
    
    def has_api_key(self, model: str) -> bool:
        """
        指定されたモデルのAPIキーが設定されているか確認
        
        Args:
            model: モデル名
            
        Returns:
            APIキーが設定されている場合True
        """
        provider_name = self.model_mapping.get(model)
        if not provider_name:
            return False
        return provider_name in self.providers
    
    def is_model_available(self, model: str) -> bool:
        """
        指定されたモデルが利用可能か確認
        
        Args:
            model: モデル名
            
        Returns:
            モデルが利用可能な場合True
        """
        return self.has_api_key(model)
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str
    ) -> AsyncIterator[str]:
        """
        統一されたインターフェースでストリーミングチャットを処理
        
        Args:
            messages: チャット履歴
            model: 使用するモデル名
            
        Yields:
            生成されたテキストのチャンク
            
        Raises:
            ValueError: 未知のモデルまたはAPIキーが未設定の場合
        """
        provider_name = self.model_mapping.get(model)
        if not provider_name:
            raise ValueError(f"Unknown model: {model}")
        
        provider = self.providers.get(provider_name)
        if not provider:
            raise ValueError(f"API key not configured for provider: {provider_name}")
        
        async for chunk in provider.stream_chat(messages, model):
            yield chunk
