import json
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import ConversationDB, MessageDB, AnalysisDB
from app.models.envelope import QueryEnvelope
from app.models.schemas import OrcaAnalysisResponse

async def get_or_create_conversation(db: AsyncSession, conversation_id: str) -> ConversationDB:
    result = await db.execute(select(ConversationDB).where(ConversationDB.id == conversation_id))
    conv = result.scalars().first()
    if not conv:
        conv = ConversationDB(
            id=conversation_id,
            title="Marine Decision Session",
            last_location_json=None,
            context_state_json=None
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
    return conv

async def get_conversation_context(db: AsyncSession, conversation_id: str) -> Dict[str, Any]:
    conv = await get_or_create_conversation(db, conversation_id)
    ctx = {}
    if conv.last_location_json:
        try:
            ctx["last_location"] = json.loads(conv.last_location_json)
        except Exception:
            pass
    if conv.context_state_json:
        try:
            ctx["state"] = json.loads(conv.context_state_json)
        except Exception:
            pass
    return ctx

async def save_analysis_turn(
    db: AsyncSession,
    conversation_id: str,
    query_text: str,
    envelope: "QueryEnvelope"
) -> None:
    """Persist one turn. Stores the public envelope so replayed history and a
    live answer are the same shape for the frontend."""
    conv = await get_or_create_conversation(db, conversation_id)
    
    # Update title from first query if default
    if conv.title == "Marine Decision Session" and query_text:
        conv.title = query_text[:60] + ("..." if len(query_text) > 60 else "")

    # Update context
    conv.last_location_json = json.dumps(envelope.meta.location.model_dump(mode="json"))
    state = {
        "last_intent": envelope.intent.value,
        "last_risk": envelope.risk.score if envelope.risk else None,
        "last_temporal": envelope.meta.temporal.label
    }
    conv.context_state_json = json.dumps(state)

    # Save User message
    user_msg = MessageDB(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="user",
        content=query_text
    )
    db.add(user_msg)

    # Save Assistant message
    assistant_msg = MessageDB(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="assistant",
        content=envelope.answer.narrative
    )
    db.add(assistant_msg)

    # Save Analysis DB record
    analysis_db = AnalysisDB(
        id=envelope.request_id,
        conversation_id=conversation_id,
        query_text=query_text,
        intent=envelope.intent.value,
        result_type=envelope.intent.value,
        summary=envelope.answer.headline,
        risk_score=envelope.risk.score if envelope.risk else None,
        response_json=envelope.model_dump_json()
    )
    db.add(analysis_db)

    await db.commit()

async def list_recent_conversations(db: AsyncSession, limit: int = 15) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(ConversationDB).order_by(ConversationDB.updated_at.desc()).limit(limit)
    )
    convs = result.scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in convs
    ]

async def get_conversation_analyses(db: AsyncSession, conversation_id: str) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(AnalysisDB)
        .where(AnalysisDB.conversation_id == conversation_id)
        .order_by(AnalysisDB.created_at.asc())
    )
    items = result.scalars().all()
    return [json.loads(item.response_json) for item in items]
