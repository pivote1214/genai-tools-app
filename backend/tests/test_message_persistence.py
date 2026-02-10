"""
メッセージ永続化のプロパティベーステスト

Feature: ai-chat-mvp
Property 3: メッセージの永続化
検証: 要件 3.1, 3.2

任意の完了したメッセージ（ユーザーまたはアシスタント）に対して、
そのメッセージがMessage_Storeに保存されること
"""

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
def test_message_persistence_property(role, content, model):
    """
    **Validates: Requirements 3.1, 3.2**

    プロパティ: 任意の完了したメッセージに対して、
    そのメッセージがMessage_Storeに保存されること
    """
    # インメモリデータベースを使用
    repo = MessageRepository(db_url="sqlite:///:memory:")

    # メッセージを保存
    saved_message = repo.save_message(role, content, model)

    # 保存されたメッセージを取得
    messages = repo.get_all_messages()

    # 検証: メッセージが保存されていること
    assert len(messages) == 1, "メッセージが保存されていない"
    assert messages[0].id == saved_message.id, "保存されたメッセージのIDが一致しない"
    assert messages[0].role == role, (
        f"roleが一致しない: expected={role}, actual={messages[0].role}"
    )
    assert messages[0].content == content, "contentが一致しない"
    assert messages[0].model == model, (
        f"modelが一致しない: expected={model}, actual={messages[0].model}"
    )


@given(
    messages_data=st.lists(
        st.tuples(
            st.sampled_from(["user", "assistant"]),
            st.text(min_size=1, max_size=500),
            st.sampled_from(AVAILABLE_MODELS),
        ),
        min_size=1,
        max_size=10,
    )
)
def test_multiple_messages_persistence(messages_data):
    """
    **Validates: Requirements 3.1, 3.2**

    プロパティ: 複数のメッセージが順番に保存されること
    """
    repo = MessageRepository(db_url="sqlite:///:memory:")

    # 複数のメッセージを保存
    saved_ids = []
    for role, content, model in messages_data:
        saved_message = repo.save_message(role, content, model)
        saved_ids.append(saved_message.id)

    # 全メッセージを取得
    all_messages = repo.get_all_messages()

    # 検証: 保存した数と取得した数が一致すること
    assert len(all_messages) == len(messages_data), (
        f"保存されたメッセージ数が一致しない: expected={len(messages_data)}, actual={len(all_messages)}"
    )

    # 検証: 各メッセージの内容が一致すること
    for i, (role, content, model) in enumerate(messages_data):
        assert all_messages[i].role == role, f"Message {i}: roleが一致しない"
        assert all_messages[i].content == content, f"Message {i}: contentが一致しない"
        assert all_messages[i].model == model, f"Message {i}: modelが一致しない"
