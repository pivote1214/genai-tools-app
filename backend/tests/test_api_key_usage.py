"""
APIキー使用のユニットテスト

リクエストヘッダーに適切なAPIキーが含まれることを検証

検証: 要件 5.3
"""
import os
import pytest
from unittest.mock import patch
from app.services.openai_provider import OpenAIProvider
from app.services.claude_provider import ClaudeProvider
from app.services.google_provider import GoogleProvider


def test_openai_provider_requires_api_key():
    """OpenAIProviderがAPIキーを要求すること"""
    # 環境変数をクリア
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="OPENAI_API_KEY is not set"):
            OpenAIProvider()


def test_openai_provider_uses_provided_api_key():
    """OpenAIProviderが提供されたAPIキーを使用すること"""
    test_key = "test-openai-key"
    provider = OpenAIProvider(api_key=test_key)
    
    assert provider.api_key == test_key
    assert provider.client.api_key == test_key


def test_openai_provider_uses_env_api_key():
    """OpenAIProviderが環境変数からAPIキーを読み込むこと"""
    test_key = "env-openai-key"
    
    with patch.dict(os.environ, {'OPENAI_API_KEY': test_key}):
        provider = OpenAIProvider()
        
        assert provider.api_key == test_key
        assert provider.client.api_key == test_key


def test_claude_provider_requires_api_key():
    """ClaudeProviderがAPIキーを要求すること"""
    # 環境変数をクリア
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY is not set"):
            ClaudeProvider()


def test_claude_provider_uses_provided_api_key():
    """ClaudeProviderが提供されたAPIキーを使用すること"""
    test_key = "test-claude-key"
    provider = ClaudeProvider(api_key=test_key)
    
    assert provider.api_key == test_key
    assert provider.client.api_key == test_key


def test_claude_provider_uses_env_api_key():
    """ClaudeProviderが環境変数からAPIキーを読み込むこと"""
    test_key = "env-claude-key"
    
    with patch.dict(os.environ, {'ANTHROPIC_API_KEY': test_key}):
        provider = ClaudeProvider()
        
        assert provider.api_key == test_key
        assert provider.client.api_key == test_key


def test_google_provider_requires_api_key():
    """GoogleProviderがAPIキーを要求すること"""
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="GEMINI_API_KEY or GOOGLE_API_KEY is not set"):
            GoogleProvider()


def test_google_provider_uses_gemini_api_key():
    """GoogleProviderがGEMINI_API_KEYを優先して使用すること"""
    test_key = "env-gemini-key"

    with patch.dict(os.environ, {'GEMINI_API_KEY': test_key}, clear=True):
        provider = GoogleProvider()

        assert provider.api_key == test_key
        assert provider.client.api_key == test_key


def test_google_provider_fallbacks_to_google_api_key():
    """GoogleProviderがGOOGLE_API_KEYをフォールバック使用すること"""
    test_key = "env-google-key"

    with patch.dict(os.environ, {'GOOGLE_API_KEY': test_key}, clear=True):
        provider = GoogleProvider()

        assert provider.api_key == test_key
        assert provider.client.api_key == test_key
