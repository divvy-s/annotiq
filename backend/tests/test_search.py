import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from app.main import app
from app.db import AsyncSessionLocal
from app.models.models import Organization, User, Role, Meeting, Speaker, TranscriptChunk
from app.services.search_service import hybrid_search
from app.schemas.intelligence import SearchResult
from sqlalchemy.future import select
from sqlalchemy import text

# Test embeddings
QUERY_EMBEDDING = [0.1] * 1536
CHUNK_1_EMBEDDING = [0.1] * 1536  # Exact match for semantic
CHUNK_2_EMBEDDING = [0.0] * 1536  # No match
CHUNK_3_EMBEDDING = [-0.1] * 1536 # Opposite

@pytest_asyncio.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.fixture
def mock_openai():
    with patch("app.services.search_service.embed_texts", new_callable=AsyncMock) as mock_embed:
        with patch("app.services.search_service.client.chat.completions.create", new_callable=AsyncMock) as mock_chat:
            mock_embed.return_value = [QUERY_EMBEDDING]
            
            mock_choice = AsyncMock()
            mock_choice.message.content = '["synonym1", "synonym2"]'
            mock_chat.return_value.choices = [mock_choice]
            
            yield mock_embed, mock_chat

@pytest.mark.asyncio
async def test_hybrid_search_relevance_and_isolation(db_session, mock_openai):
    org_a_id = uuid.uuid4()
    org_b_id = uuid.uuid4()
    
    # Setup Data
    org_a = Organization(id=org_a_id, name="Org A Search")
    org_b = Organization(id=org_b_id, name="Org B Search")
    
    role = Role(id=uuid.uuid4(), role_name=f"User_{uuid.uuid4()}")
    user_a = User(id=uuid.uuid4(), email=f"a_{uuid.uuid4()}@a.com", name="A", organization_id=org_a_id, role_id=role.id)
    user_b = User(id=uuid.uuid4(), email=f"b_{uuid.uuid4()}@b.com", name="B", organization_id=org_b_id, role_id=role.id)
    
    meeting_a = Meeting(id=uuid.uuid4(), organization_id=org_a_id, uploaded_by=user_a.id, title="Meeting A")
    meeting_b = Meeting(id=uuid.uuid4(), organization_id=org_b_id, uploaded_by=user_b.id, title="Meeting B")
    
    speaker_a = Speaker(id=uuid.uuid4(), meeting_id=meeting_a.id, organization_id=org_a_id, display_name="Speaker A")
    
    # Chunk 1: Org A, highly relevant semantically and keyword
    chunk1 = TranscriptChunk(
        id=uuid.uuid4(),
        meeting_id=meeting_a.id,
        organization_id=org_a_id,
        speaker_id=speaker_a.id,
        chunk_text="This is about apples and synonym1.",
        embedding=CHUNK_1_EMBEDDING,
        timestamp_start=0.0
    )
    
    # Chunk 2: Org A, moderately relevant
    chunk2 = TranscriptChunk(
        id=uuid.uuid4(),
        meeting_id=meeting_a.id,
        organization_id=org_a_id,
        speaker_id=speaker_a.id,
        chunk_text="Oranges are good.",
        embedding=CHUNK_2_EMBEDDING,
        timestamp_start=10.0
    )
    
    # Chunk 3: Org B, highly relevant, but wrong org
    chunk3 = TranscriptChunk(
        id=uuid.uuid4(),
        meeting_id=meeting_b.id,
        organization_id=org_b_id,
        chunk_text="Apples and synonym1 again.",
        embedding=CHUNK_1_EMBEDDING,
        timestamp_start=20.0
    )
    
    db_session.add_all([org_a, org_b, role, user_a, user_b, meeting_a, meeting_b, speaker_a, chunk1, chunk2, chunk3])
    await db_session.flush()
    
    # Update tsvector_col natively using raw SQL. SQLAlchemy can execute raw SQL inside the session.
    await db_session.execute(text("UPDATE transcript_chunks SET tsvector_col = to_tsvector('english', chunk_text)"))
    await db_session.commit()
    
    # Run test
    results = await hybrid_search(query="apples", org_id=org_a_id, limit=10)
    
    # Assertions
    assert len(results) == 2  # Only chunks from Org A
    
    # Isolation: Org B chunk should not be present
    assert not any(r.meeting_id == meeting_b.id for r in results)
    
    # Relevance: Chunk 1 should be first
    assert results[0].chunk_text == "This is about apples and synonym1."
    assert results[1].chunk_text == "Oranges are good."
    
    # Normalization: Both scores normalized to [0,1] before weighting
    assert 0.0 <= results[0].final_score <= 1.0
    assert 0.0 <= results[1].final_score <= 1.0
    
    # Limit test
    limit_results = await hybrid_search(query="apples", org_id=org_a_id, limit=1)
    assert len(limit_results) == 1
    assert limit_results[0].chunk_text == "This is about apples and synonym1."
