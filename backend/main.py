"""
FastAPI バックエンドのエントリーポイント
"""

import json
import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# .envファイルを読み込み（importの前に実行する必要がある）
load_dotenv()  # noqa: E402

from app.repositories.message_repository import MessageRepository  # noqa: E402
from app.services.llm_service import LLMService  # noqa: E402

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        RotatingFileHandler("app.log", maxBytes=10485760, backupCount=5),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger(__name__)


# データモデル
class ChatMessage(BaseModel):
    """チャットメッセージ"""

    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    """チャットリクエスト"""

    conversation_id: str
    message: str
    model: str
    history: list[ChatMessage] = []


class ModelInfo(BaseModel):
    """モデル情報"""

    id: str
    name: str
    provider: Literal["openai", "claude", "google"]
    description: str


class ConversationCreateRequest(BaseModel):
    """会話作成リクエスト"""

    title: str = "新しいチャット"


class ConversationResponse(BaseModel):
    """会話レスポンス"""

    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationSummary(ConversationResponse):
    """会話サマリー"""

    message_count: int
    last_message_preview: str


class StoredMessage(BaseModel):
    """保存済みメッセージ"""

    id: int
    conversation_id: str
    role: Literal["user", "assistant"]
    content: str
    model: str
    timestamp: datetime


app = FastAPI(title="AI Chat MVP")

# サービスの初期化
llm_service = LLMService()
message_repository = MessageRepository()

# CORS設定
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """起動時の処理"""
    logger.info("Starting AI Chat MVP API")

    # APIキーの検証
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    google_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not openai_key:
        logger.warning(
            "OPENAI_API_KEY is not set. OpenAI models will not be available."
        )
    else:
        logger.info("OPENAI_API_KEY is configured")

    if not anthropic_key:
        logger.warning(
            "ANTHROPIC_API_KEY is not set. Claude models will not be available."
        )
    else:
        logger.info("ANTHROPIC_API_KEY is configured")

    if not google_key:
        logger.warning(
            "GEMINI_API_KEY / GOOGLE_API_KEY is not set. Gemini models will not be available."
        )
    else:
        logger.info("Gemini API key is configured")

    if not openai_key and not anthropic_key and not google_key:
        logger.error(
            "No API keys configured. At least one API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY or GOOGLE_API_KEY) must be set."
        )
        raise RuntimeError("No API keys configured")


@app.get("/")
async def root():
    """ヘルスチェックエンドポイント"""
    return {"message": "AI Chat MVP API"}


@app.get("/api/models", response_model=list[ModelInfo])
async def get_models():
    """利用可能なLLMモデルのリストを返す"""
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    google_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    models = []

    if openai_key:
        models.extend(
            [
                ModelInfo(
                    id="gpt-5.2",
                    name="GPT-5.2",
                    provider="openai",
                    description="OpenAIの最新モデル",
                ),
                ModelInfo(
                    id="gpt-5.2-pro",
                    name="GPT-5.2 Pro",
                    provider="openai",
                    description="OpenAIの高性能モデル",
                ),
            ]
        )

    if google_key:
        models.extend(
            [
                ModelInfo(
                    id="gemini-3-pro-preview",
                    name="Gemini 3 Pro",
                    provider="google",
                    description="Googleの高性能モデル",
                ),
                ModelInfo(
                    id="gemini-3-flash-preview",
                    name="Gemini 3 Flash",
                    provider="google",
                    description="Googleの高速モデル",
                ),
            ]
        )

    if anthropic_key:
        models.extend(
            [
                ModelInfo(
                    id="claude-opus-4-5",
                    name="Claude 4.5 Opus",
                    provider="claude",
                    description="Claudeの高性能モデル",
                ),
                ModelInfo(
                    id="claude-sonnet-4-5",
                    name="Claude 4.5 Sonnet",
                    provider="claude",
                    description="Claudeのバランス型モデル",
                ),
                ModelInfo(
                    id="claude-haiku-4-5",
                    name="Claude 4.5 Haiku",
                    provider="claude",
                    description="Claudeの高速モデル",
                ),
            ]
        )

    logger.info("Returning %s available models", len(models))
    return models


@app.post("/api/conversations", response_model=ConversationResponse)
async def create_conversation(request: ConversationCreateRequest | None = None):
    """新しい会話を作成する"""
    title = request.title if request else "新しいチャット"
    conversation = message_repository.create_conversation(title=title)
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@app.get("/api/conversations", response_model=list[ConversationSummary])
async def list_conversations():
    """会話サマリー一覧を返す"""
    summaries = message_repository.get_conversation_summaries()
    return [ConversationSummary(**summary) for summary in summaries]


@app.delete(
    "/api/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_conversation(conversation_id: str):
    """指定会話を削除する"""
    deleted = message_repository.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="会話が見つかりません"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(
    "/api/conversations/{conversation_id}/messages", response_model=list[StoredMessage]
)
async def get_conversation_messages(conversation_id: str):
    """指定会話のメッセージ一覧を返す"""
    conversation = message_repository.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="会話が見つかりません"
        )

    messages = message_repository.get_messages_by_conversation(conversation_id)
    return [
        StoredMessage(
            id=message.id,
            conversation_id=message.conversation_id or conversation_id,
            role=message.role,
            content=message.content,
            model=message.model,
            timestamp=message.timestamp,
        )
        for message in messages
    ]


@app.post("/api/chat")
async def chat_stream(request: ChatRequest):
    """チャットメッセージを受信し、ストリーミングレスポンスを返す"""
    logger.info("Chat request received for model: %s", request.model)

    # 会話が存在しない場合は作成
    message_repository.ensure_conversation(request.conversation_id)

    # モデルが利用可能か確認
    if not llm_service.is_model_available(request.model):
        logger.error("Model not available: %s", request.model)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="サービスに接続できません",
        )

    async def generate():
        try:
            # メッセージ履歴を構築
            messages = [
                {"role": msg.role, "content": msg.content} for msg in request.history
            ]
            messages.append({"role": "user", "content": request.message})

            full_response = ""

            # ストリーミングレスポンスを生成
            async for chunk in llm_service.stream_chat(messages, request.model):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"

            # メッセージをデータベースに保存
            try:
                message_repository.save_message(
                    "user", request.message, request.model, request.conversation_id
                )
                message_repository.save_message(
                    "assistant", full_response, request.model, request.conversation_id
                )
                logger.info("Messages saved to database")
            except Exception as db_error:
                logger.error("Database error: %s", db_error)
                # データベースエラーはユーザーに影響させない

            # 完了を通知
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.error("Error in chat stream: %s", e, exc_info=True)
            error_message = "エラーが発生しました"

            # エラーの種類に応じてメッセージを変更
            error_str = str(e).lower()
            if "rate" in error_str or "quota" in error_str:
                error_message = (
                    "リクエストが多すぎます。しばらく待ってから再試行してください"
                )
            elif "auth" in error_str or "api key" in error_str:
                error_message = "サービスに接続できません"
            elif "network" in error_str or "connection" in error_str:
                error_message = (
                    "ネットワークエラーが発生しました。接続を確認してください"
                )

            yield f"data: {json.dumps({'error': error_message})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
