"""会話リポジトリテスト"""

from app.repositories.message_repository import MessageRepository


def test_save_message_with_conversation_id():
    repo = MessageRepository(db_url='sqlite:///:memory:')
    conversation = repo.create_conversation('テスト会話', 'conv-test')

    saved = repo.save_message('user', 'hello', 'gpt-5.2', conversation.id)

    assert saved.conversation_id == 'conv-test'
    messages = repo.get_messages_by_conversation('conv-test')
    assert len(messages) == 1
    assert messages[0].content == 'hello'


def test_get_conversation_summaries_order_desc():
    repo = MessageRepository(db_url='sqlite:///:memory:')

    repo.create_conversation('会話1', 'conv-1')
    repo.create_conversation('会話2', 'conv-2')
    repo.save_message('user', 'first', 'gpt-5.2', 'conv-1')
    repo.save_message('user', 'second', 'gpt-5.2', 'conv-2')

    summaries = repo.get_conversation_summaries()

    assert summaries[0]['id'] == 'conv-2'
    assert summaries[1]['id'] == 'conv-1'


def test_delete_conversation_removes_messages():
    repo = MessageRepository(db_url='sqlite:///:memory:')

    repo.create_conversation('会話1', 'conv-1')
    repo.save_message('user', 'first', 'gpt-5.2', 'conv-1')
    repo.save_message('assistant', 'reply', 'gpt-5.2', 'conv-1')

    deleted = repo.delete_conversation('conv-1')

    assert deleted is True
    assert repo.get_conversation('conv-1') is None
    assert repo.get_messages_by_conversation('conv-1') == []


def test_delete_conversation_returns_false_when_not_found():
    repo = MessageRepository(db_url='sqlite:///:memory:')

    deleted = repo.delete_conversation('missing')

    assert deleted is False
