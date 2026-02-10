"""
SSE接続のユニットテスト

要件: 4.1, 4.4
"""

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# 環境変数を設定（テスト用）
os.environ["OPENAI_API_KEY"] = "test-openai-key"
os.environ["ANTHROPIC_API_KEY"] = "test-anthropic-key"

from main import app


@pytest.fixture
def client():
    """テストクライアントを作成"""
    return TestClient(app)


@pytest.fixture
def mock_llm_service():
    """LLMServiceをモック"""
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = True

        async def mock_stream():
            yield "Hello"
            yield " "
            yield "World"

        mock.stream_chat.return_value = mock_stream()
        yield mock


@pytest.fixture
def mock_message_repository():
    """MessageRepositoryをモック"""
    with patch("main.message_repository") as mock:
        mock.save_message.return_value = None
        yield mock


def test_sse_connection_established(client, mock_llm_service, mock_message_repository):
    """
    ストリーミング接続が確立されることを検証
    要件: 4.1
    """
    response = client.post(
        "/api/chat",
        json={
            "message": "Hello",
            "model": "gpt-5.2",
            "conversation_id": "test-conversation",
            "history": [],
        },
    )

    # ステータスコードが200であることを確認
    assert response.status_code == 200

    # Content-Typeがtext/event-streamであることを確認
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"


def test_sse_streaming_response(client, mock_llm_service, mock_message_repository):
    """
    ストリーミングレスポンスが正しく送信されることを検証
    要件: 4.1
    """
    response = client.post(
        "/api/chat",
        json={
            "message": "Test message",
            "model": "gpt-5.2",
            "conversation_id": "test-conversation",
            "history": [],
        },
    )

    # レスポンスを読み取る
    chunks = []
    for line in response.iter_lines():
        if line:
            chunks.append(line)

    # チャンクが受信されたことを確認
    assert len(chunks) > 0

    # data: プレフィックスが含まれることを確認
    assert any(chunk.startswith("data: ") for chunk in chunks)


def test_sse_connection_close_on_completion(
    client, mock_llm_service, mock_message_repository
):
    """
    ストリーミング完了時に接続が適切にクローズされることを検証
    要件: 4.4
    """
    response = client.post(
        "/api/chat",
        json={
            "message": "Test",
            "model": "gpt-5.2",
            "conversation_id": "test-conversation",
            "history": [],
        },
    )

    # 全てのチャンクを読み取る
    chunks = list(response.iter_lines())

    # 最後のチャンクにdone: trueが含まれることを確認
    last_chunks = [chunk for chunk in chunks if chunk]
    assert len(last_chunks) > 0

    # doneフラグを含むチャンクが存在することを確認
    done_found = any(
        '"done": true' in chunk or '"done":true' in chunk for chunk in last_chunks
    )
    assert done_found, "完了フラグが見つかりませんでした"


def test_sse_model_not_available(client, mock_message_repository):
    """
    モデルが利用できない場合のエラーハンドリングを検証
    要件: 4.1
    """
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = False

        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "invalid-model",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        # 503エラーが返されることを確認
        assert response.status_code == 503
        assert "サービスに接続できません" in response.json()["detail"]
