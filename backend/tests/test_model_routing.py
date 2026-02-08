"""
モデル別ルーティングのテスト

選択したモデルがそのままLLMサービスへ渡されることを検証する。
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app


@pytest.fixture
def client():
    """テストクライアントを作成"""
    return TestClient(app)


@pytest.fixture
def mock_llm_service():
    """LLMServiceをモック"""
    with patch("main.llm_service") as mock:
        yield mock


@pytest.fixture
def mock_message_repository():
    """MessageRepositoryをモック"""
    with patch("main.message_repository") as mock:
        mock.save_message.return_value = MagicMock(id=1)
        yield mock


@pytest.mark.parametrize(
    "model",
    [
        "gpt-4o",
        "gpt-4o-mini",
        "claude-opus-4-5",
        "claude-sonnet-4-5",
        "claude-haiku-4-5",
    ],
)
def test_chat_routes_selected_model(client, mock_llm_service, mock_message_repository, model):
    """
    /api/chatが選択されたモデルをそのままLLMサービスへ渡すことを検証
    """
    async def mock_stream():
        yield "ok"

    mock_llm_service.is_model_available.return_value = True
    mock_llm_service.stream_chat.return_value = mock_stream()

    response = client.post(
        "/api/chat",
        json={
            "message": "routing test",
            "model": model,
            "history": [],
        },
    )

    assert response.status_code == 200
    assert mock_llm_service.stream_chat.call_count == 1
    assert mock_llm_service.stream_chat.call_args[0][1] == model


def test_models_endpoint_returns_new_claude_ids(client):
    """
    /api/modelsが新しいClaudeモデルIDを返すことを検証
    """
    with patch.dict(
        "os.environ",
        {
            "OPENAI_API_KEY": "test-openai-key",
            "ANTHROPIC_API_KEY": "test-anthropic-key",
        },
    ):
        response = client.get("/api/models")
        assert response.status_code == 200

        model_ids = [model["id"] for model in response.json()]
        assert len(model_ids) == 5
        assert "gpt-4o" in model_ids
        assert "gpt-4o-mini" in model_ids
        assert "claude-opus-4-5" in model_ids
        assert "claude-sonnet-4-5" in model_ids
        assert "claude-haiku-4-5" in model_ids
