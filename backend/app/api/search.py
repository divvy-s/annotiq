from fastapi import APIRouter, Depends, Query
from typing import List
from uuid import UUID
from app.schemas.intelligence import SearchResult, SearchRequest, MeetingSummaryResult
from app.api.deps import get_current_org_id
from app.services import search_service

router = APIRouter()

@router.post("/", response_model=List[SearchResult])
async def search_transcripts(
    request: SearchRequest,
    org_id: UUID = Depends(get_current_org_id)
):
    return await search_service.hybrid_search(
        query=request.query,
        org_id=org_id,
        meeting_ids=request.meeting_ids,
        limit=request.limit or 10
    )

@router.get("/meetings", response_model=List[MeetingSummaryResult])
async def search_meetings(
    q: str = Query(..., description="Search query for meeting summaries"),
    limit: int = Query(10, description="Max results to return"),
    org_id: UUID = Depends(get_current_org_id)
):
    return await search_service.semantic_summary_search(
        query=q,
        org_id=org_id,
        limit=limit
    )
