"""メッセージ/会話リポジトリ"""

import logging
from datetime import datetime
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.models.message import Base, Conversation, Message

logger = logging.getLogger(__name__)

DEFAULT_CONVERSATION_TITLE = "新しいチャット"
LEGACY_CONVERSATION_ID = "legacy-imported"
LEGACY_CONVERSATION_TITLE = "インポート済み履歴"


class MessageRepository:
    """メッセージ/会話リポジトリ"""

    def __init__(self, db_url: str = "sqlite:///./chat.db"):
        self.engine = create_engine(db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(
            bind=self.engine, autocommit=False, autoflush=False
        )
        self._migrate_schema()

    def _migrate_schema(self) -> None:
        """既存DBへのスキーマ移行を実行する。"""
        inspector = inspect(self.engine)

        if "messages" not in inspector.get_table_names():
            return

        message_columns = {col["name"] for col in inspector.get_columns("messages")}

        with self.engine.begin() as connection:
            if "conversation_id" not in message_columns:
                logger.info("Adding conversation_id column to messages table")
                connection.execute(
                    text("ALTER TABLE messages ADD COLUMN conversation_id VARCHAR")
                )

            connection.execute(
                text(
                    """
                    UPDATE messages
                    SET conversation_id = :legacy_id
                    WHERE conversation_id IS NULL OR conversation_id = ''
                    """
                ),
                {"legacy_id": LEGACY_CONVERSATION_ID},
            )

        self._ensure_legacy_conversation_record()

    def _ensure_legacy_conversation_record(self) -> None:
        """legacy-imported の会話レコードを必要に応じて作成する。"""
        session: Session = self.SessionLocal()
        try:
            has_legacy_messages = (
                session.query(Message.id)
                .filter(Message.conversation_id == LEGACY_CONVERSATION_ID)
                .first()
                is not None
            )
            if not has_legacy_messages:
                return

            conversation = session.get(Conversation, LEGACY_CONVERSATION_ID)
            first_message = (
                session.query(Message)
                .filter(Message.conversation_id == LEGACY_CONVERSATION_ID)
                .order_by(Message.timestamp.asc())
                .first()
            )
            last_message = (
                session.query(Message)
                .filter(Message.conversation_id == LEGACY_CONVERSATION_ID)
                .order_by(Message.timestamp.desc())
                .first()
            )

            if first_message is None or last_message is None:
                return

            if conversation is None:
                conversation = Conversation(
                    id=LEGACY_CONVERSATION_ID,
                    title=LEGACY_CONVERSATION_TITLE,
                    created_at=first_message.timestamp,
                    updated_at=last_message.timestamp,
                )
                session.add(conversation)
            else:
                conversation.updated_at = last_message.timestamp

            session.commit()
        finally:
            session.close()

    def _build_title(self, content: str) -> str:
        title = content.strip().replace("\n", " ")
        if not title:
            return DEFAULT_CONVERSATION_TITLE
        return title[:40]

    def create_conversation(
        self,
        title: str = DEFAULT_CONVERSATION_TITLE,
        conversation_id: str | None = None,
    ) -> Conversation:
        """会話を作成する。"""
        session: Session = self.SessionLocal()
        try:
            now = datetime.utcnow()
            conversation = Conversation(
                id=conversation_id or str(uuid4()),
                title=title,
                created_at=now,
                updated_at=now,
            )
            session.add(conversation)
            session.commit()
            session.refresh(conversation)
            return conversation
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_conversation(self, conversation_id: str) -> Conversation | None:
        """会話をIDで取得する。"""
        session: Session = self.SessionLocal()
        try:
            return session.get(Conversation, conversation_id)
        finally:
            session.close()

    def delete_conversation(self, conversation_id: str) -> bool:
        """会話と関連メッセージを削除する。"""
        session: Session = self.SessionLocal()
        try:
            conversation = session.get(Conversation, conversation_id)
            if conversation is None:
                return False

            session.query(Message).filter(
                Message.conversation_id == conversation_id
            ).delete()
            session.delete(conversation)
            session.commit()
            return True
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def ensure_conversation(self, conversation_id: str) -> Conversation:
        """会話が無ければ作成し、存在する会話を返す。"""
        session: Session = self.SessionLocal()
        try:
            conversation = session.get(Conversation, conversation_id)
            if conversation is None:
                now = datetime.utcnow()
                conversation = Conversation(
                    id=conversation_id,
                    title=DEFAULT_CONVERSATION_TITLE,
                    created_at=now,
                    updated_at=now,
                )
                session.add(conversation)
                session.commit()
                session.refresh(conversation)
            return conversation
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def save_message(
        self,
        role: str,
        content: str,
        model: str,
        conversation_id: str = LEGACY_CONVERSATION_ID,
    ) -> Message:
        """メッセージを保存する。"""
        session: Session = self.SessionLocal()
        try:
            conversation = session.get(Conversation, conversation_id)
            if conversation is None:
                now = datetime.utcnow()
                conversation = Conversation(
                    id=conversation_id,
                    title=DEFAULT_CONVERSATION_TITLE,
                    created_at=now,
                    updated_at=now,
                )
                session.add(conversation)

            message = Message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                model=model,
            )
            session.add(message)

            if role == "user" and conversation.title == DEFAULT_CONVERSATION_TITLE:
                conversation.title = self._build_title(content)
            conversation.updated_at = datetime.utcnow()

            session.commit()
            session.refresh(message)
            logger.info(
                "Message saved: id=%s, conversation_id=%s, role=%s, model=%s",
                message.id,
                conversation_id,
                role,
                model,
            )
            return message
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save message: {e}")
            raise
        finally:
            session.close()

    def get_messages_by_conversation(self, conversation_id: str) -> list[Message]:
        """会話ID単位でメッセージを取得する。"""
        session: Session = self.SessionLocal()
        try:
            return (
                session.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.timestamp.asc())
                .all()
            )
        finally:
            session.close()

    def get_conversation_summaries(self) -> list[dict]:
        """会話サマリー一覧を更新日時降順で取得する。"""
        session: Session = self.SessionLocal()
        try:
            conversations = (
                session.query(Conversation)
                .order_by(Conversation.updated_at.desc())
                .all()
            )

            summaries = []
            for conversation in conversations:
                messages = (
                    session.query(Message)
                    .filter(Message.conversation_id == conversation.id)
                    .order_by(Message.timestamp.asc())
                    .all()
                )

                last_preview = ""
                if messages:
                    last_preview = messages[-1].content[:80]

                summaries.append(
                    {
                        "id": conversation.id,
                        "title": conversation.title,
                        "created_at": conversation.created_at,
                        "updated_at": conversation.updated_at,
                        "message_count": len(messages),
                        "last_message_preview": last_preview,
                    }
                )

            return summaries
        finally:
            session.close()

    def get_all_messages(self) -> list[Message]:
        """全メッセージを取得する（互換維持）。"""
        session: Session = self.SessionLocal()
        try:
            messages = session.query(Message).order_by(Message.timestamp).all()
            logger.info("Retrieved %s messages", len(messages))
            return messages
        finally:
            session.close()
