"""
保存データ完全性のプロパティベーステスト

Feature: ai-chat-mvp
Property 7: 保存データの完全性
検証: 要件 3.3

任意の保存されるメッセージに対して、タイムスタンプ、送信者（user/assistant）、
メッセージ内容、使用モデルの全フィールドが含まれること
"""

from datetime import datetime

from hypothesis import given
from hypothesis import strategies as st

from app.repositories.message_repository import MessageRepository

# 利用可能なモデルのリスト
AVAILABLE_MODELS = [
    "gpt-5.2",
    "gpt-5.2-pro",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
]


@given(
    role=st.sampled_from(["user", "assistant"]),
    content=st.text(min_size=1, max_size=1000),
    model=st.sampled_from(AVAILABLE_MODELS),
)
def test_saved_message_completeness_property(role, content, model):
    """
    **Validates: Requirements 3.3**

    プロパティ: 任意の保存されるメッセージに対して、
    全フィールド（id, role, content, model, timestamp）が含まれること
    """
    # インメモリデータベースを使用
    repo = MessageRepository(db_url="sqlite:///:memory:")

    # メッセージを保存
    saved_message = repo.save_message(role, content, model)

    # 検証: 全フィールドの存在と正確性
    assert saved_message.id is not None, "idフィールドが存在しない"
    assert isinstance(saved_message.id, int), "idが整数でない"
    assert saved_message.id > 0, "idが正の整数でない"

    assert saved_message.role is not None, "roleフィールドが存在しない"
    assert saved_message.role == role, (
        f"roleが一致しない: expected={role}, actual={saved_message.role}"
    )
    assert saved_message.role in ["user", "assistant"], (
        f"roleが不正な値: {saved_message.role}"
    )

    assert saved_message.content is not None, "contentフィールドが存在しない"
    assert saved_message.content == content, "contentが一致しない"

    assert saved_message.model is not None, "modelフィールドが存在しない"
    assert saved_message.model == model, (
        f"modelが一致しない: expected={model}, actual={saved_message.model}"
    )

    assert saved_message.timestamp is not None, "timestampフィールドが存在しない"
    assert isinstance(saved_message.timestamp, datetime), (
        "timestampがdatetimeオブジェクトでない"
    )

    # タイムスタンプが現在時刻に近いことを確認（保存時に自動設定されることを検証）
    now = datetime.utcnow()
    time_diff = abs((now - saved_message.timestamp).total_seconds())
    assert time_diff < 5, f"timestampが現在時刻から離れすぎている: {time_diff}秒"


@given(
    role=st.sampled_from(["user", "assistant"]),
    content=st.text(min_size=1, max_size=1000),
    model=st.sampled_from(AVAILABLE_MODELS),
)
def test_retrieved_message_completeness(role, content, model):
    """
    **Validates: Requirements 3.3**

    プロパティ: データベースから取得したメッセージにも
    全フィールドが含まれること
    """
    repo = MessageRepository(db_url="sqlite:///:memory:")

    # メッセージを保存
    saved_message = repo.save_message(role, content, model)

    # データベースから取得
    retrieved_messages = repo.get_all_messages()

    assert len(retrieved_messages) == 1, "メッセージが取得できない"

    retrieved = retrieved_messages[0]

    # 検証: 取得したメッセージの全フィールド
    assert retrieved.id is not None, "取得したメッセージにidが存在しない"
    assert retrieved.id == saved_message.id, "取得したメッセージのidが一致しない"

    assert retrieved.role is not None, "取得したメッセージにroleが存在しない"
    assert retrieved.role == role, "取得したメッセージのroleが一致しない"

    assert retrieved.content is not None, "取得したメッセージにcontentが存在しない"
    assert retrieved.content == content, "取得したメッセージのcontentが一致しない"

    assert retrieved.model is not None, "取得したメッセージにmodelが存在しない"
    assert retrieved.model == model, "取得したメッセージのmodelが一致しない"

    assert retrieved.timestamp is not None, "取得したメッセージにtimestampが存在しない"
    assert isinstance(retrieved.timestamp, datetime), (
        "取得したメッセージのtimestampがdatetimeでない"
    )
