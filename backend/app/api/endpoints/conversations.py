from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.database.session import get_db
from app.database.repository import (
    list_recent_conversations,
    get_conversation_analyses,
    get_or_create_conversation,
)

router = APIRouter()

@router.get("/conversations", response_model=List[Dict[str, Any]])
async def get_conversations(db: AsyncSession = Depends(get_db)):
    """Retrieves recent conversation threads."""
    return await list_recent_conversations(db)

@router.get("/conversations/{conversation_id}/analyses")
async def get_analyses_for_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all analyses executed within a conversation."""
    return await get_conversation_analyses(db, conversation_id)
