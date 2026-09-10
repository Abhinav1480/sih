import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class ConversationDB(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), default="New Marine Analysis")
    last_location_json = Column(Text, nullable=True)
    context_state_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    messages = relationship("MessageDB", back_populates="conversation", cascade="all, delete-orphan")
    analyses = relationship("AnalysisDB", back_populates="conversation", cascade="all, delete-orphan")

class MessageDB(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(32), default="user")  # "user", "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    conversation = relationship("ConversationDB", back_populates="messages")

class AnalysisDB(Base):
    __tablename__ = "analyses"

    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id"), nullable=False)
    query_text = Column(Text, nullable=False)
    intent = Column(String(64), nullable=False)
    result_type = Column(String(64), default="marine_safety")
    summary = Column(Text, nullable=False)
    risk_score = Column(Integer, nullable=True)
    response_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    conversation = relationship("ConversationDB", back_populates="analyses")
