import uuid
from typing import List
from openai import AsyncOpenAI
from tenacity import retry, wait_random_exponential, stop_after_attempt
from sqlalchemy import select, update
from app.config import settings
from app.db import AsyncSessionLocal
from app.models.models import TranscriptChunk

# Initialize AsyncOpenAI
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

@retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(6))
async def _embed_batch(texts: List[str]) -> List[List[float]]:
    response = await client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    return [data.embedding for data in response.data]

async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embeds a list of texts in batches of 100 to handle API limits.
    """
    batch_size = 100
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        embeddings = await _embed_batch(batch)
        all_embeddings.extend(embeddings)
        
    return all_embeddings

async def embed_and_store_chunks(meeting_id: uuid.UUID, org_id: uuid.UUID):
    """
    Finds TranscriptChunks for a meeting that lack embeddings, embeds them, and updates the DB.
    """
    async with AsyncSessionLocal() as session:
        # Fetch chunks that need embeddings
        stmt = select(TranscriptChunk).where(
            TranscriptChunk.meeting_id == meeting_id,
            TranscriptChunk.organization_id == org_id,
            TranscriptChunk.embedding.is_(None)
        )
        result = await session.execute(stmt)
        chunks = result.scalars().all()
        
        if not chunks:
            return
        
        # We need to maintain order to correctly map embeddings back
        texts_to_embed = [chunk.chunk_text for chunk in chunks]
        
        # Get embeddings
        embeddings = await embed_texts(texts_to_embed)
        
        # Update chunks
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding
            
        # Commit changes
        await session.commit()
