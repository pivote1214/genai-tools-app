"""
データベースエラーハンドリングのユニットテスト

検証: 要件 3.4
- データベース書き込みエラー時のログ記録を検証
- エラー時にもアプリケーションが継続することを検証
"""

from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.repositories.message_repository import MessageRepository


def test_save_message_logs_error_on_database_failure():
    """
    データベース書き込みエラー時にエラーがログに記録されることを検証

    **Validates: Requirements 3.4**
    """
    # インメモリデータベースを使用
    repo = MessageRepository(db_url="sqlite:///:memory:")

    # SessionLocalの呼び出しをモック
    mock_session = MagicMock()
    mock_session.commit.side_effect = SQLAlchemyError("Database write error")

    with (
        patch.object(repo, "SessionLocal", return_value=mock_session),
        patch("app.repositories.message_repository.logger") as mock_logger,
        pytest.raises(SQLAlchemyError),
    ):
        repo.save_message("user", "test message", "gpt-5.2")

    # エラーログが記録されたことを確認
    mock_logger.error.assert_called_once()
    error_call_args = mock_logger.error.call_args[0][0]
    assert "Failed to save message" in error_call_args


def test_save_message_rolls_back_on_error():
    """
    データベース書き込みエラー時にトランザクションがロールバックされることを検証

    **Validates: Requirements 3.4**
    """
    repo = MessageRepository(db_url="sqlite:///:memory:")

    mock_session = MagicMock()
    mock_session.commit.side_effect = SQLAlchemyError("Database error")

    with patch.object(repo, "SessionLocal", return_value=mock_session):
        # エラーが発生することを確認
        with pytest.raises(SQLAlchemyError):
            repo.save_message("user", "test message", "gpt-5.2")

        # ロールバックが呼ばれたことを確認
        mock_session.rollback.assert_called_once()


def test_save_message_closes_session_on_error():
    """
    データベース書き込みエラー時でもセッションが適切にクローズされることを検証

    **Validates: Requirements 3.4**
    """
    repo = MessageRepository(db_url="sqlite:///:memory:")

    mock_session = MagicMock()
    mock_session.commit.side_effect = SQLAlchemyError("Database error")

    with patch.object(repo, "SessionLocal", return_value=mock_session):
        # エラーが発生することを確認
        with pytest.raises(SQLAlchemyError):
            repo.save_message("user", "test message", "gpt-5.2")

        # セッションがクローズされたことを確認
        mock_session.close.assert_called_once()


def test_get_all_messages_closes_session_after_retrieval():
    """
    メッセージ取得後にセッションが適切にクローズされることを検証

    **Validates: Requirements 3.4**
    """
    repo = MessageRepository(db_url="sqlite:///:memory:")

    mock_session = MagicMock()
    # クエリ結果をモック
    mock_query = MagicMock()
    mock_session.query.return_value = mock_query
    mock_query.order_by.return_value.all.return_value = []

    with patch.object(repo, "SessionLocal", return_value=mock_session):
        # メッセージを取得
        repo.get_all_messages()

        # セッションがクローズされたことを確認
        mock_session.close.assert_called_once()


def test_database_error_does_not_prevent_application_continuation():
    """
    データベースエラーが発生しても、アプリケーションが継続できることを検証

    **Validates: Requirements 3.4**

    このテストは、エラーが適切に例外として伝播され、
    呼び出し側でハンドリングできることを確認します。
    """
    repo = MessageRepository(db_url="sqlite:///:memory:")

    # 最初のメッセージを正常に保存
    message1 = repo.save_message("user", "first message", "gpt-5.2")
    assert message1.id is not None

    # 2番目のメッセージでエラーをシミュレート
    mock_session = MagicMock()
    mock_session.commit.side_effect = SQLAlchemyError("Simulated error")

    with (
        patch.object(repo, "SessionLocal", return_value=mock_session),
        pytest.raises(SQLAlchemyError),
    ):
        repo.save_message("user", "second message", "gpt-5.2")

    # エラー後も、新しいリポジトリインスタンスで操作を継続できることを確認
    # （実際のアプリケーションでは、エラーをキャッチして継続する）
    message3 = repo.save_message("user", "third message", "gpt-5.2")
    assert message3.id is not None

    # 最初と3番目のメッセージが保存されていることを確認
    all_messages = repo.get_all_messages()
    assert len(all_messages) == 2
    assert all_messages[0].content == "first message"
    assert all_messages[1].content == "third message"
