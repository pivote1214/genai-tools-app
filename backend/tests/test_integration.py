"""
統合テスト - チャットフロー全体の動作を検証

要件: 1.1, 1.2, 1.3, 1.4, 1.5
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import json

from main import app
from app.repositories.message_repository import MessageRepository


@pytest.fixture
def client():
    """テストクライアントを作成"""
    return TestClient(app)


@pytest.fixture
def mock_llm_service():
    """LLMサービスのモックを作成"""
    with patch('main.llm_service') as mock:
        yield mock


@pytest.fixture
def mock_message_repository():
    """メッセージリポジトリのモックを作成"""
    with patch('main.message_repository') as mock:
        yield mock


class TestChatIntegration:
    """チャットフロー全体の統合テスト"""
    
    def test_complete_chat_flow(self, client, mock_llm_service, mock_message_repository):
        """
        完全なチャットフローの動作を検証
        要件: 1.1, 1.2, 1.3, 1.4
        """
        # モックの設定
        async def mock_stream():
            """ストリーミングレスポンスをシミュレート"""
            for chunk in ["Hello", " ", "World", "!"]:
                yield chunk
        
        mock_llm_service.is_model_available.return_value = True
        mock_llm_service.stream_chat.return_value = mock_stream()
        mock_message_repository.save_message.return_value = MagicMock(id=1)
        
        # チャットリクエストを送信
        response = client.post(
            "/api/chat",
            json={
                "message": "Hello",
                "model": "gpt-4o",
                "history": []
            }
        )
        
        # レスポンスの検証
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        
        # ストリーミングレスポンスの内容を検証
        content = response.text
        assert "data: " in content
        assert '"content":"Hello"' in content or '"content": "Hello"' in content
        assert '"done":true' in content or '"done": true' in content
        
        # メッセージが保存されたことを確認
        assert mock_message_repository.save_message.call_count == 2
        
        # ユーザーメッセージの保存を確認
        user_call = mock_message_repository.save_message.call_args_list[0]
        assert user_call[0][0] == "user"
        assert user_call[0][1] == "Hello"
        assert user_call[0][2] == "gpt-4o"
        
        # アシスタントメッセージの保存を確認
        assistant_call = mock_message_repository.save_message.call_args_list[1]
        assert assistant_call[0][0] == "assistant"
        assert assistant_call[0][1] == "Hello World!"
        assert assistant_call[0][2] == "gpt-4o"
    
    def test_streaming_response_format(self, client, mock_llm_service, mock_message_repository):
        """
        ストリーミングレスポンスの受信と表示を検証
        要件: 1.2, 1.3
        """
        # モックの設定
        async def mock_stream():
            yield "Test"
            yield " "
            yield "message"
        
        mock_llm_service.is_model_available.return_value = True
        mock_llm_service.stream_chat.return_value = mock_stream()
        mock_message_repository.save_message.return_value = MagicMock(id=1)
        
        # チャットリクエストを送信
        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "gpt-4o",
                "history": []
            }
        )
        
        # SSE形式の検証
        lines = response.text.split('\n')
        data_lines = [line for line in lines if line.startswith('data: ')]
        
        # 少なくとも3つのデータライン（3つのチャンク）と1つの完了通知があることを確認
        assert len(data_lines) >= 4
        
        # 各チャンクがJSON形式であることを確認
        for line in data_lines[:-1]:  # 最後の行以外
            data = json.loads(line[6:])  # "data: "を除去
            if 'content' in data:
                assert isinstance(data['content'], str)
        
        # 最後のデータラインが完了通知であることを確認
        last_data = json.loads(data_lines[-1][6:])
        assert last_data.get('done') is True
    
    def test_error_handling_in_chat_flow(self, client, mock_llm_service, mock_message_repository):
        """
        エラーハンドリングを検証
        要件: 1.5
        """
        # モックの設定 - LLMサービスがエラーを発生させる
        async def mock_stream_error():
            raise Exception("API Error")
            yield  # この行は実行されない
        
        mock_llm_service.is_model_available.return_value = True
        mock_llm_service.stream_chat.return_value = mock_stream_error()
        
        # チャットリクエストを送信
        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "gpt-4o",
                "history": []
            }
        )
        
        # エラーレスポンスの検証
        assert response.status_code == 200  # SSEなので200を返す
        content = response.text
        
        # エラーメッセージが含まれていることを確認
        assert "data: " in content
        assert '"error"' in content
    
    def test_model_unavailable_error(self, client, mock_llm_service):
        """
        モデルが利用できない場合のエラーハンドリングを検証
        要件: 1.5
        """
        # モックの設定 - モデルが利用できない
        mock_llm_service.is_model_available.return_value = False
        
        # チャットリクエストを送信
        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "gpt-4o",
                "history": []
            }
        )
        
        # エラーレスポンスの検証
        assert response.status_code == 503
        assert "サービスに接続できません" in response.json()["detail"]
    
    def test_chat_with_history(self, client, mock_llm_service, mock_message_repository):
        """
        会話履歴を含むチャットフローを検証
        要件: 1.1, 1.4
        """
        # モックの設定
        async def mock_stream():
            yield "Response"
        
        mock_llm_service.is_model_available.return_value = True
        mock_llm_service.stream_chat.return_value = mock_stream()
        mock_message_repository.save_message.return_value = MagicMock(id=1)
        
        # 会話履歴を含むリクエスト
        response = client.post(
            "/api/chat",
            json={
                "message": "Follow-up question",
                "model": "gpt-4o",
                "history": [
                    {"role": "user", "content": "First message"},
                    {"role": "assistant", "content": "First response"}
                ]
            }
        )
        
        # レスポンスの検証
        assert response.status_code == 200
        
        # LLMサービスが正しい履歴で呼び出されたことを確認
        call_args = mock_llm_service.stream_chat.call_args
        messages = call_args[0][0]
        
        # 履歴 + 新しいメッセージ = 3つのメッセージ
        assert len(messages) == 3
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "First message"
        assert messages[1]["role"] == "assistant"
        assert messages[1]["content"] == "First response"
        assert messages[2]["role"] == "user"
        assert messages[2]["content"] == "Follow-up question"


class TestModelsEndpoint:
    """モデルエンドポイントの統合テスト"""
    
    def test_get_models_with_api_keys(self, client):
        """
        APIキーが設定されている場合のモデルリスト取得を検証
        """
        with patch.dict('os.environ', {
            'OPENAI_API_KEY': 'test-openai-key',
            'ANTHROPIC_API_KEY': 'test-anthropic-key'
        }):
            response = client.get("/api/models")
            
            assert response.status_code == 200
            models = response.json()
            
            # 5つのモデルが返されることを確認
            assert len(models) == 5
            
            # モデルIDを確認
            model_ids = [model["id"] for model in models]
            assert "gpt-4o" in model_ids
            assert "gpt-4o-mini" in model_ids
            assert "claude-opus-4-5" in model_ids
            assert "claude-sonnet-4-5" in model_ids
            assert "claude-haiku-4-5" in model_ids
    
    def test_get_models_openai_only(self, client):
        """
        OpenAI APIキーのみが設定されている場合のモデルリスト取得を検証
        """
        with patch.dict('os.environ', {
            'OPENAI_API_KEY': 'test-openai-key'
        }, clear=True):
            response = client.get("/api/models")
            
            assert response.status_code == 200
            models = response.json()
            
            # OpenAIモデルのみが返されることを確認
            assert len(models) == 2
            model_ids = [model["id"] for model in models]
            assert "gpt-4o" in model_ids
            assert "gpt-4o-mini" in model_ids


class TestDatabaseIntegration:
    """データベース統合テスト"""
    
    def test_message_persistence_in_chat_flow(self, client, mock_llm_service, mock_message_repository):
        """
        チャットフロー内でのメッセージ永続化を検証
        要件: 1.4
        
        このテストは、チャットフロー全体でメッセージが正しく保存されることを検証します。
        """
        # モックの設定
        async def mock_stream():
            yield "Test response"
        
        mock_llm_service.is_model_available.return_value = True
        mock_llm_service.stream_chat.return_value = mock_stream()
        mock_message_repository.save_message.return_value = MagicMock(id=1)
        
        # チャットリクエストを送信
        response = client.post(
            "/api/chat",
            json={
                "message": "Test message",
                "model": "gpt-4o",
                "history": []
            }
        )
        
        assert response.status_code == 200
        
        # メッセージが保存されたことを確認
        assert mock_message_repository.save_message.call_count == 2
        
        # ユーザーメッセージの保存を確認
        user_call = mock_message_repository.save_message.call_args_list[0]
        assert user_call[0][0] == "user"
        assert user_call[0][1] == "Test message"
        assert user_call[0][2] == "gpt-4o"
        
        # アシスタントメッセージの保存を確認
        assistant_call = mock_message_repository.save_message.call_args_list[1]
        assert assistant_call[0][0] == "assistant"
        assert assistant_call[0][1] == "Test response"
        assert assistant_call[0][2] == "gpt-4o"
