"""
プロパティ 15: プロバイダー固有の形式変換のプロパティベーステスト

任意のLLM_Provider（OpenAIまたはClaude）へのリクエストに対して、
そのプロバイダー固有の形式に正しく変換され、レスポンスは統一された形式で返されること

検証: 要件 6.2, 6.3, 6.4
"""
import pytest
from hypothesis import given, strategies as st
from app.services.claude_provider import ClaudeProvider


# Feature: ai-chat-mvp, Property 15: プロバイダー固有の形式変換


@given(
    messages=st.lists(
        st.fixed_dictionaries({
            'role': st.sampled_from(['user', 'assistant', 'system']),
            'content': st.text(min_size=1, max_size=100)
        }),
        min_size=1,
        max_size=10
    )
)
def test_claude_message_conversion(messages):
    """
    Claudeプロバイダーがメッセージを正しく変換すること
    
    - システムメッセージは別パラメータとして分離される
    - user/assistantメッセージは適切に変換される
    """
    provider = ClaudeProvider(api_key='test-key')
    system_message, claude_messages = provider._convert_messages(messages)
    
    # システムメッセージの検証
    system_messages = [msg for msg in messages if msg['role'] == 'system']
    if system_messages:
        # 最後のシステムメッセージが使用される
        assert system_message == system_messages[-1]['content']
    else:
        assert system_message is None
    
    # user/assistantメッセージの検証
    expected_messages = [
        msg for msg in messages 
        if msg['role'] in ('user', 'assistant')
    ]
    assert len(claude_messages) == len(expected_messages)
    
    for claude_msg, expected_msg in zip(claude_messages, expected_messages):
        assert claude_msg['role'] == expected_msg['role']
        assert claude_msg['content'] == expected_msg['content']


@given(
    role=st.sampled_from(['user', 'assistant']),
    content=st.text(min_size=1, max_size=100)
)
def test_claude_preserves_user_assistant_messages(role, content):
    """
    Claudeプロバイダーがuser/assistantメッセージを保持すること
    """
    provider = ClaudeProvider(api_key='test-key')
    messages = [{'role': role, 'content': content}]
    
    system_message, claude_messages = provider._convert_messages(messages)
    
    assert system_message is None
    assert len(claude_messages) == 1
    assert claude_messages[0]['role'] == role
    assert claude_messages[0]['content'] == content


@given(
    system_content=st.text(min_size=1, max_size=100),
    user_content=st.text(min_size=1, max_size=100)
)
def test_claude_separates_system_messages(system_content, user_content):
    """
    Claudeプロバイダーがシステムメッセージを分離すること
    """
    provider = ClaudeProvider(api_key='test-key')
    messages = [
        {'role': 'system', 'content': system_content},
        {'role': 'user', 'content': user_content}
    ]
    
    system_message, claude_messages = provider._convert_messages(messages)
    
    assert system_message == system_content
    assert len(claude_messages) == 1
    assert claude_messages[0]['role'] == 'user'
    assert claude_messages[0]['content'] == user_content
