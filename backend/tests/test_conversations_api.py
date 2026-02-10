"""会話APIのテスト"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_create_conversation(client):
    with patch("main.message_repository") as mock_repo:
        mock_repo.create_conversation.return_value = MagicMock(
            id="conv-1",
            title="新しいチャット",
            created_at="2026-01-01T00:00:00",
            updated_at="2026-01-01T00:00:00",
        )

        response = client.post("/api/conversations", json={"title": "新しいチャット"})

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "conv-1"
        assert payload["title"] == "新しいチャット"


def test_list_conversations(client):
    with patch("main.message_repository") as mock_repo:
        mock_repo.get_conversation_summaries.return_value = [
            {
                "id": "conv-1",
                "title": "会話1",
                "created_at": "2026-01-01T00:00:00",
                "updated_at": "2026-01-01T00:00:00",
                "message_count": 2,
                "last_message_preview": "こんにちは",
            }
        ]

        response = client.get("/api/conversations")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 1
        assert payload[0]["id"] == "conv-1"
        assert payload[0]["message_count"] == 2


def test_get_conversation_messages(client):
    with patch("main.message_repository") as mock_repo:
        mock_repo.get_conversation.return_value = MagicMock(id="conv-1")
        mock_repo.get_messages_by_conversation.return_value = [
            MagicMock(
                id=1,
                conversation_id="conv-1",
                role="user",
                content="hello",
                model="gpt-5.2",
                timestamp="2026-01-01T00:00:00",
            )
        ]

        response = client.get("/api/conversations/conv-1/messages")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 1
        assert payload[0]["conversation_id"] == "conv-1"


def test_delete_conversation_success(client):
    with patch("main.message_repository") as mock_repo:
        mock_repo.delete_conversation.return_value = True

        response = client.delete("/api/conversations/conv-1")

        assert response.status_code == 204
        mock_repo.delete_conversation.assert_called_once_with("conv-1")


def test_delete_conversation_not_found(client):
    with patch("main.message_repository") as mock_repo:
        mock_repo.delete_conversation.return_value = False

        response = client.delete("/api/conversations/not-found")

        assert response.status_code == 404
        payload = response.json()
        assert payload["detail"] == "会話が見つかりません"
