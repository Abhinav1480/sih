import json
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import ConversationDB, MessageDB, AnalysisDB
from app.models.envelope import QueryEnvelope
from app.models.schemas import OrcaAnalysisResponse

# In-memory fast cache for active sessions, synced with persistent DB
_CONVERSATION_CACHE: Dict[str, Dict[str, Any]] = {}

def get_cached_conversation_context(conversation_id: str) -> Dict[str, Any]:
    return _CONVERSATION_CACHE.get(conversation_id, {})

def set_cached_conversation_context(conversation_id: str, context: Dict[str, Any]) -> None:
    _CONVERSATION_CACHE[conversation_id] = context

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
    # Check in-memory cache first
    cached = _CONVERSATION_CACHE.get(conversation_id)
    if cached and "state" in cached and cached["state"]:
        return cached

    conv = await get_or_create_conversation(db, conversation_id)
    ctx: Dict[str, Any] = {}
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
    else:
        ctx["state"] = {}

    # Elevate critical structured state keys to top-level for direct planner access
    state = ctx.get("state", {})
    if isinstance(state, dict):
        for key in [
            "origin",
            "destination",
            "primary_location",
            "secondary_location",
            "candidate_routes",
            "recommended_route",
            "alternative_routes",
            "selected_route_id",
            "route_analysis",
            "route_comparison",
            "time_window",
            "constraints",
            "last_intent",
            "last_result_type"
        ]:
            if key in state and state[key] is not None and key not in ctx:
                ctx[key] = state[key]

    _CONVERSATION_CACHE[conversation_id] = ctx
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

    # Preserve the structured state the orchestrator has already cached for
    # this session (route candidates, selected route, displacement); this
    # function only layers the per-turn summary keys on top. Everything
    # persisted here is derived from the public envelope.
    existing_ctx = _CONVERSATION_CACHE.get(conversation_id, {})
    existing_state = dict(existing_ctx.get("state", {}) or {})
    if not existing_state and conv.context_state_json:
        try:
            existing_state = json.loads(conv.context_state_json)
        except Exception:
            existing_state = {}

    location = envelope.meta.location.model_dump(mode="json")
    new_state = dict(existing_state)
    new_state["last_intent"] = envelope.intent.value
    new_state["last_risk"] = envelope.risk.score if envelope.risk else None
    new_state["last_temporal"] = envelope.meta.temporal.label
    new_state["time_window"] = envelope.meta.temporal.model_dump(mode="json")
    new_state["last_result_type"] = envelope.intent.value
    new_state["last_query_text"] = query_text
    new_state["last_executive_summary"] = envelope.answer.narrative
    new_state["preferred_language"] = envelope.language
    new_state.setdefault("original_departure_time", envelope.meta.temporal.label)
    new_state["current_departure_time"] = envelope.meta.temporal.label
    new_state["time_offset"] = envelope.meta.temporal.offset_hours
    new_state["primary_location"] = location

    # Update DB fields
    conv.last_location_json = json.dumps(location)
    conv.context_state_json = json.dumps(new_state, default=str)

    # Sync cache
    updated_ctx = {
        "last_location": location,
        "state": new_state
    }
    for key in [
        "origin",
        "destination",
        "primary_location",
        "secondary_location",
        "candidate_routes",
        "recommended_route",
        "alternative_routes",
        "selected_route",
        "selected_route_id",
        "original_route_analysis",
        "route_analysis",
        "route_comparison",
        "time_window",
        "original_departure_time",
        "current_departure_time",
        "time_offset",
        "constraints",
        "last_intent",
        "last_result_type"
    ]:
        if key in new_state and new_state[key] is not None:
            updated_ctx[key] = new_state[key]
    _CONVERSATION_CACHE[conversation_id] = updated_ctx

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
