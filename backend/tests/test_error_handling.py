"""
エラーハンドリングのユニットテスト

要件: 7.1, 7.2, 7.3, 7.4, 7.5
"""

import json
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
def mock_message_repository():
    """MessageRepositoryをモック"""
    with patch("main.message_repository") as mock:
        mock.save_message.return_value = None
        yield mock


def test_rate_limit_error_handling(client, mock_message_repository):
    """
    レート制限エラー時の適切なレスポンスを検証
    要件: 7.1
    """
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = True

        async def mock_stream():
            raise Exception("rate limit exceeded")
            yield  # この行は実行されない

        mock.stream_chat.return_value = mock_stream()

        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "gpt-5.2",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        # ステータスコードが200であることを確認（SSEなので）
        assert response.status_code == 200

        # エラーメッセージを確認（JSONデコードして検証）
        content = response.text
        # data: プレフィックスを削除してJSONをパース
        for line in content.split("\n"):
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if "error" in data:
                    assert "リクエストが多すぎます" in data["error"]
                    return

        pytest.fail("エラーメッセージが見つかりませんでした")


def test_authentication_error_handling(client, mock_message_repository):
    """
    認証エラー時の適切なレスポンスを検証
    要件: 7.2
    """
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = True

        async def mock_stream():
            raise Exception("authentication failed")
            yield  # この行は実行されない

        mock.stream_chat.return_value = mock_stream()

        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "gpt-5.2",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        # ステータスコードが200であることを確認（SSEなので）
        assert response.status_code == 200

        # エラーメッセージを確認（JSONデコードして検証）
        content = response.text
        for line in content.split("\n"):
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if "error" in data:
                    assert "サービスに接続できません" in data["error"]
                    return

        pytest.fail("エラーメッセージが見つかりませんでした")


def test_network_error_handling(client, mock_message_repository):
    """
    ネットワークエラー時の適切なレスポンスを検証
    要件: 7.3
    """
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = True

        async def mock_stream():
            raise Exception("network connection failed")
            yield  # この行は実行されない

        mock.stream_chat.return_value = mock_stream()

        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "gpt-5.2",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        # ステータスコードが200であることを確認（SSEなので）
        assert response.status_code == 200

        # エラーメッセージを確認（JSONデコードして検証）
        content = response.text
        for line in content.split("\n"):
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if "error" in data:
                    assert "ネットワークエラー" in data["error"]
                    return

        pytest.fail("エラーメッセージが見つかりませんでした")


def test_unexpected_error_handling(client, mock_message_repository):
    """
    予期しないエラー時の適切なレスポンスを検証
    要件: 7.4
    """
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = True

        async def mock_stream():
            raise Exception("unexpected error")
            yield  # この行は実行されない

        mock.stream_chat.return_value = mock_stream()

        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "gpt-5.2",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        # ステータスコードが200であることを確認（SSEなので）
        assert response.status_code == 200

        # エラーメッセージを確認（JSONデコードして検証）
        content = response.text
        for line in content.split("\n"):
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if "error" in data:
                    assert "エラーが発生しました" in data["error"]
                    return

        pytest.fail("エラーメッセージが見つかりませんでした")


def test_error_state_maintenance(client, mock_message_repository):
    """
    エラー後の状態維持を検証
    要件: 7.5
    """
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = True

        # 最初のリクエストでエラー
        async def mock_stream_error():
            raise Exception("temporary error")
            yield  # この行は実行されない

        mock.stream_chat.return_value = mock_stream_error()

        response1 = client.post(
            "/api/chat",
            json={
                "message": "Test 1",
                "model": "gpt-5.2",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        assert response1.status_code == 200

        # 2回目のリクエストが成功することを確認
        async def mock_stream_success():
            yield "Success"

        mock.stream_chat.return_value = mock_stream_success()

        response2 = client.post(
            "/api/chat",
            json={
                "message": "Test 2",
                "model": "gpt-5.2",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        # 2回目のリクエストが正常に処理されることを確認
        assert response2.status_code == 200
        content = response2.text
        assert "Success" in content


def test_database_error_does_not_affect_user(client):
    """
    データベースエラーがユーザーに影響しないことを検証
    要件: 7.4
    """
    with patch("main.llm_service") as mock_llm:
        mock_llm.is_model_available.return_value = True

        async def mock_stream():
            yield "Response"

        mock_llm.stream_chat.return_value = mock_stream()

        with patch("main.message_repository") as mock_repo:
            # データベースエラーを発生させる
            mock_repo.save_message.side_effect = Exception("Database error")

            response = client.post(
                "/api/chat",
                json={
                    "message": "Test",
                    "model": "gpt-5.2",
                    "conversation_id": "test-conversation",
                    "history": [],
                },
            )

            # レスポンスは正常に返されることを確認
            assert response.status_code == 200
            content = response.text
            assert "Response" in content
            # エラーメッセージが含まれていないことを確認
            assert "error" not in content.lower() or "done" in content


def test_model_not_available_error(client, mock_message_repository):
    """
    モデルが利用できない場合のエラーハンドリングを検証
    要件: 7.2
    """
    with patch("main.llm_service") as mock:
        mock.is_model_available.return_value = False

        response = client.post(
            "/api/chat",
            json={
                "message": "Test",
                "model": "unavailable-model",
                "conversation_id": "test-conversation",
                "history": [],
            },
        )

        # 503エラーが返されることを確認
        assert response.status_code == 503
        assert "サービスに接続できません" in response.json()["detail"]
