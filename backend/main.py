"""
FastAPI バックエンドのエントリーポイント
"""
import json
import logging
import os
from logging.handlers import RotatingFileHandler
from typing import List, Literal
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.llm_service import LLMService
from app.repositories.message_repository import MessageRepository

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler('app.log', maxBytes=10485760, backupCount=5),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


# データモデル
class ChatMessage(BaseModel):
    """チャットメッセージ"""
    role: Literal['user', 'assistant', 'system']
    content: str


class ChatRequest(BaseModel):
    """チャットリクエスト"""
    message: str
    model: str
    history: List[ChatMessage] = []


class ModelInfo(BaseModel):
    """モデル情報"""
    id: str
    name: str
    provider: Literal['openai', 'claude']
    description: str


app = FastAPI(title="AI Chat MVP")

# サービスの初期化
llm_service = LLMService()
message_repository = MessageRepository()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # フロントエンドのURL
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
    
    if not openai_key:
        logger.warning("OPENAI_API_KEY is not set. OpenAI models will not be available.")
    else:
        logger.info("OPENAI_API_KEY is configured")
    
    if not anthropic_key:
        logger.warning("ANTHROPIC_API_KEY is not set. Claude models will not be available.")
    else:
        logger.info("ANTHROPIC_API_KEY is configured")
    
    if not openai_key and not anthropic_key:
        logger.error("No API keys configured. At least one API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) must be set.")
        raise RuntimeError("No API keys configured")


@app.get("/")
async def root():
    """ヘルスチェックエンドポイント"""
    return {"message": "AI Chat MVP API"}


@app.get("/api/models", response_model=List[ModelInfo])
async def get_models():
    """利用可能なLLMモデルのリストを返す"""
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    
    models = []
    
    if openai_key:
        models.extend([
            ModelInfo(
                id="gpt-4o",
                name="GPT-4o",
                provider="openai",
                description="OpenAIの最新モデル"
            ),
            ModelInfo(
                id="gpt-4o-mini",
                name="GPT-4o Mini",
                provider="openai",
                description="OpenAIの軽量モデル"
            )
        ])
    
    if anthropic_key:
        models.extend([
            ModelInfo(
                id="claude-sonnet-4.5",
                name="Claude 4.5 Sonnet",
                provider="claude",
                description="Claudeのバランス型モデル"
            ),
            ModelInfo(
                id="claude-haiku-4.5",
                name="Claude 4.5 Haiku",
                provider="claude",
                description="Claudeの高速モデル"
            )
        ])
    
    logger.info(f"Returning {len(models)} available models")
    return models


@app.post("/api/chat")
async def chat_stream(request: ChatRequest):
    """
    チャットメッセージを受信し、ストリーミングレスポンスを返す
    """
    logger.info(f"Chat request received for model: {request.model}")
    
    # モデルが利用可能か確認
    if not llm_service.is_model_available(request.model):
        logger.error(f"Model not available: {request.model}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="サービスに接続できません"
        )
    
    async def generate():
        try:
            # メッセージ履歴を構築
            messages = [{"role": msg.role, "content": msg.content} for msg in request.history]
            messages.append({"role": "user", "content": request.message})
            
            full_response = ""
            
            # ストリーミングレスポンスを生成
            async for chunk in llm_service.stream_chat(messages, request.model):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # メッセージをデータベースに保存
            try:
                message_repository.save_message("user", request.message, request.model)
                message_repository.save_message("assistant", full_response, request.model)
                logger.info("Messages saved to database")
            except Exception as db_error:
                logger.error(f"Database error: {db_error}")
                # データベースエラーはユーザーに影響させない
            
            # 完了を通知
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in chat stream: {e}", exc_info=True)
            error_message = "エラーが発生しました"
            
            # エラーの種類に応じてメッセージを変更
            error_str = str(e).lower()
            if "rate" in error_str or "quota" in error_str:
                error_message = "リクエストが多すぎます。しばらく待ってから再試行してください"
            elif "auth" in error_str or "api key" in error_str:
                error_message = "サービスに接続できません"
            elif "network" in error_str or "connection" in error_str:
                error_message = "ネットワークエラーが発生しました。接続を確認してください"
            
            yield f"data: {json.dumps({'error': error_message})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
