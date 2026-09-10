from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.orchestrator import orchestrator
from app.api.envelope_builder import build_envelope
from app.database.repository import get_conversation_context, save_analysis_turn
from app.database.session import get_db
from app.models.envelope import QueryEnvelope
from app.models.schemas import UserQueryRequest

router = APIRouter()


@router.post("/query", response_model=QueryEnvelope)
async def process_user_query(
    request: UserQueryRequest,
    db: AsyncSession = Depends(get_db)
) -> QueryEnvelope:
    """
    Primary ORCA natural-language marine intelligence endpoint.

    Accepts arbitrary natural language, plans tasks dynamically, coordinates
    the collaborative specialist agents, and returns the response envelope
    specified in `docs/API_CONTRACT.md`.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    # 1. Fetch existing conversational memory if conversation_id provided
    conv_ctx = {}
    if request.conversation_id:
        conv_ctx = await get_conversation_context(db, request.conversation_id)

    # 2. Execute dynamic multi-agent pipeline
    analysis = await orchestrator.execute_query(request, conversation_context=conv_ctx)

    # 3. Map the internal result onto the public contract
    envelope = build_envelope(analysis)

    # 4. Persist analysis turn to database
    try:
        await save_analysis_turn(
            db=db,
            conversation_id=envelope.session_id,
            query_text=request.query,
            envelope=envelope,
        )
    except Exception:
        # Fail-soft on persistence: a history write must never cost the user
        # their answer.
        pass

    return envelope
