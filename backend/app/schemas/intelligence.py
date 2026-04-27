from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

class TranscriptChunkResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    organization_id: UUID
    speaker_id: Optional[UUID]
    chunk_text: str
    timestamp_start: float
    timestamp_end: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SummaryResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    organization_id: UUID
    short_summary: str
    detailed_summary: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ActionItemResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    organization_id: UUID
    assigned_to: Optional[str]
    description: str
    due_date: Optional[date]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SearchResult(BaseModel):
    chunk_text: str
    timestamp_start: float
    speaker_name: Optional[str]
    meeting_title: Optional[str]
    meeting_id: UUID
    final_score: float

class SearchRequest(BaseModel):
    query: str
    meeting_ids: Optional[List[UUID]] = None
    limit: Optional[int] = 10

class MeetingSummaryResult(BaseModel):
    meeting_id: UUID
    title: Optional[str]
    short_summary: Optional[str]
    score: float
