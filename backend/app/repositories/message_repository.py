"""メッセージリポジトリ"""
from typing import List
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.models.message import Message, Base
import logging

logger = logging.getLogger(__name__)


class MessageRepository:
    """メッセージリポジトリ"""
    
    def __init__(self, db_url: str = "sqlite:///./chat.db"):
        """
        リポジトリを初期化
        
        Args:
            db_url: データベース接続URL
        """
        self.engine = create_engine(db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
    
    def save_message(self, role: str, content: str, model: str) -> Message:
        """
        メッセージを保存
        
        Args:
            role: メッセージの送信者 ('user' or 'assistant')
            content: メッセージ内容
            model: 使用されたモデル名
            
        Returns:
            保存されたMessageオブジェクト
            
        Raises:
            Exception: データベース書き込みエラー
        """
        session: Session = self.SessionLocal()
        try:
            message = Message(
                role=role,
                content=content,
                model=model
            )
            session.add(message)
            session.commit()
            session.refresh(message)
            logger.info(f"Message saved: id={message.id}, role={role}, model={model}")
            return message
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save message: {e}")
            raise
        finally:
            session.close()
    
    def get_all_messages(self) -> List[Message]:
        """
        全メッセージを取得（将来の機能拡張用）
        
        Returns:
            タイムスタンプ順にソートされたメッセージリスト
        """
        session: Session = self.SessionLocal()
        try:
            messages = session.query(Message).order_by(Message.timestamp).all()
            logger.info(f"Retrieved {len(messages)} messages")
            return messages
        finally:
            session.close()
