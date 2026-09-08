from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.database.repository import get_conversation_context, save_analysis_turn
from app.models.schemas import UserQueryRequest, OrcaAnalysisResponse
from app.agents.orchestrator import orchestrator

router = APIRouter()

@router.post("/query", response_model=OrcaAnalysisResponse)
async def process_user_query(
    request: UserQueryRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Primary ORCA natural-language marine intelligence endpoint.
    Accepts arbitrary natural language queries, dynamically plans tasks,
    coordinates collaborative specialist agents, and returns typed rich results.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    # 1. Fetch existing conversational memory if conversation_id provided
    conv_ctx = {}
    if request.conversation_id:
        conv_ctx = await get_conversation_context(db, request.conversation_id)

    # 2. Execute dynamic multi-agent pipeline
    response = await orchestrator.execute_query(request, conversation_context=conv_ctx)

    # 3. Persist analysis turn to database
    try:
        await save_analysis_turn(
            db=db,
            conversation_id=response.conversation_id,
            query_text=request.query,
            response=response
        )
    except Exception as e:
        # Fail-soft on persistence
        pass

    return response
