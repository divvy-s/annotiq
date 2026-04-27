import pytest
import uuid
import json
import pytest_asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.embedding_service import embed_texts, embed_and_store_chunks
from app.workers.tasks import async_generate_intelligence
from app.models.models import Organization, Role, User, Meeting, TranscriptChunk, Summary, ActionItem
from app.db import AsyncSessionLocal
from sqlalchemy import select

@pytest_asyncio.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.mark.asyncio
async def test_embed_texts_batching():
    # Generate 150 texts to ensure batching logic runs
    texts = [f"text {i}" for i in range(150)]
    
    with patch("app.services.embedding_service._embed_batch", new_callable=AsyncMock) as mock_batch:
        # Mock responses for 2 batches
        mock_batch.side_effect = [
            [[0.1, 0.2]] * 100,  # First batch of 100
            [[0.3, 0.4]] * 50    # Second batch of 50
        ]
        
        result = await embed_texts(texts)
        
        assert len(result) == 150
        assert mock_batch.call_count == 2

@pytest.mark.asyncio
async def test_generate_intelligence():
    meeting_id = uuid.uuid4()
    org_id = uuid.uuid4()

    # Create mock models
    mock_meeting = MagicMock()
    mock_meeting.organization_id = org_id
    mock_meeting.status = "pending"

    mock_chunk = MagicMock()
    mock_chunk.chunk_text = "We need to launch the product by next Friday."
    mock_chunk.embedding = None

    # Mock the SQLAlchemy execute result
    mock_meeting_result = MagicMock()
    mock_meeting_result.scalars.return_value.first.return_value = mock_meeting

    mock_chunks_result = MagicMock()
    mock_chunks_result.scalars.return_value.all.return_value = [mock_chunk]

    # Setup the mock async session
    mock_session = AsyncMock()
    # We will be calling execute multiple times.
    # 1. Fetch meeting
    # 2. Fetch chunks that need embeddings
    # 3. Fetch all chunks ordered by timestamp for summarization
    mock_session.execute = AsyncMock(side_effect=[
        mock_meeting_result,
        mock_chunks_result, # for embed_and_store_chunks
        mock_chunks_result  # for fetch all chunks
    ])

    mock_session_context = AsyncMock()
    mock_session_context.__aenter__.return_value = mock_session
    
    # Mock both AsyncSessionLocal instances
    with patch("app.workers.tasks.AsyncSessionLocal", return_value=mock_session_context), \
         patch("app.services.embedding_service.AsyncSessionLocal", return_value=mock_session_context), \
         patch("app.workers.tasks.client") as mock_client, \
         patch("app.services.embedding_service.client") as mock_embedding_client:

        # Mock Embeddings
        mock_embedding_client.embeddings.create = AsyncMock(
            return_value=MagicMock(data=[MagicMock(embedding=[0.1]*1536)])
        )
        
        # Mock Chat Completions
        mock_summary_response = MagicMock()
        mock_summary_response.choices = [MagicMock(message=MagicMock(content=json.dumps({
            "short_summary": "Launch discussion",
            "detailed_summary": "Discussed launching the product."
        })))]
        
        mock_ai_response = MagicMock()
        mock_ai_response.choices = [MagicMock(message=MagicMock(content=json.dumps({
            "action_items": [{
                "assigned_to": "John",
                "description": "Launch the product",
                "due_date": "2026-05-01"
            }]
        })))]
        
        mock_client.chat.completions.create = AsyncMock(side_effect=[mock_summary_response, mock_ai_response])
        
        # Run the task
        await async_generate_intelligence(str(meeting_id))
        
    # Verify DB state updates
    assert mock_meeting.status == "processed"
    assert mock_chunk.embedding == [0.1] * 1536
    
    # Check that session.add was called for Summary and ActionItem
    add_calls = mock_session.add.call_args_list
    assert len(add_calls) == 2
    
    summary_added = add_calls[0][0][0]
    action_item_added = add_calls[1][0][0]
    
    assert summary_added.short_summary == "Launch discussion"
    assert action_item_added.description == "Launch the product"
    assert str(action_item_added.due_date) == "2026-05-01"
