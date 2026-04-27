import json
import re
from uuid import UUID
from typing import List, Optional
from sqlalchemy import text
from app.db import AsyncSessionLocal
from app.schemas.intelligence import SearchResult, MeetingSummaryResult
from app.services.embedding_service import client, embed_texts

async def expand_query(query: str) -> List[str]:
    """Call GPT-4o to expand search query."""
    prompt = f"Expand this search query into 5-8 related terms and synonyms for searching meeting transcripts. Return only a JSON array of strings. Original query: {query}"
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    
    content = response.choices[0].message.content.strip()
    if content.startswith("```json"):
        content = content[7:-3]
    elif content.startswith("```"):
        content = content[3:-3]
        
    try:
        terms = json.loads(content)
        if not isinstance(terms, list):
            terms = []
    except json.JSONDecodeError:
        terms = []
        
    return terms

async def hybrid_search(
    query: str,
    org_id: UUID,
    meeting_ids: Optional[List[UUID]] = None,
    limit: int = 10
) -> List[SearchResult]:
    
    # Step 1 - Query expansion
    expanded_terms = await expand_query(query)
    search_terms = [query] + expanded_terms
    
    safe_terms = []
    for t in search_terms:
        words = [w for w in re.split(r'\W+', t) if w]
        safe_terms.extend(words)
    
    tsquery = ' | '.join(set(safe_terms))
    if not tsquery:
        tsquery = ' | '.join([w for w in re.split(r'\W+', query) if w])
    
    # Step 3 - Semantic search
    query_embedding = (await embed_texts([query]))[0]
    
    async with AsyncSessionLocal() as session:
        # Step 2 - Keyword search
        keyword_sql = """
            SELECT c.id, c.chunk_text, c.timestamp_start, c.speaker_id, c.meeting_id,
                   ts_rank(c.tsvector_col, to_tsquery('english', :tsquery)) as keyword_score,
                   s.display_name as speaker_name, m.title as meeting_title
            FROM transcript_chunks c
            LEFT JOIN speakers s ON c.speaker_id = s.id
            JOIN meetings m ON c.meeting_id = m.id
            WHERE c.organization_id = :org_id
            AND c.tsvector_col @@ to_tsquery('english', :tsquery)
        """
        params = {"org_id": org_id, "tsquery": tsquery}
        if meeting_ids:
            keyword_sql += " AND c.meeting_id = ANY(:meeting_ids)"
            params["meeting_ids"] = meeting_ids
            
        keyword_sql += " ORDER BY keyword_score DESC LIMIT 50"
        
        keyword_result = await session.execute(text(keyword_sql), params)
        keyword_rows = keyword_result.fetchall()
        
        # Step 3 - Semantic search
        semantic_sql = """
            SELECT c.id, c.chunk_text, c.timestamp_start, c.speaker_id, c.meeting_id,
                   1 - (c.embedding <=> :query_embedding) as semantic_score,
                   s.display_name as speaker_name, m.title as meeting_title
            FROM transcript_chunks c
            LEFT JOIN speakers s ON c.speaker_id = s.id
            JOIN meetings m ON c.meeting_id = m.id
            WHERE c.organization_id = :org_id
        """
        sem_params = {"org_id": org_id, "query_embedding": str(query_embedding)}
        if meeting_ids:
            semantic_sql += " AND c.meeting_id = ANY(:meeting_ids)"
            sem_params["meeting_ids"] = meeting_ids
            
        semantic_sql += " ORDER BY c.embedding <=> :query_embedding LIMIT 50"
        
        semantic_result = await session.execute(text(semantic_sql), sem_params)
        semantic_rows = semantic_result.fetchall()
        
        # Step 4 - Hybrid merge
        k_scores = [r.keyword_score for r in keyword_rows]
        s_scores = [r.semantic_score for r in semantic_rows]
        
        def normalize(scores):
            if not scores: return []
            min_s, max_s = min(scores), max(scores)
            if max_s == min_s:
                return [1.0 for _ in scores]
            return [(s - min_s) / (max_s - min_s) for s in scores]
            
        norm_k = normalize(k_scores)
        norm_s = normalize(s_scores)
        
        chunks = {}
        for idx, row in enumerate(keyword_rows):
            chunks[row.id] = {
                "chunk_text": row.chunk_text,
                "timestamp_start": row.timestamp_start,
                "speaker_name": row.speaker_name,
                "meeting_title": row.meeting_title,
                "meeting_id": row.meeting_id,
                "k_score": norm_k[idx],
                "s_score": 0.0
            }
            
        for idx, row in enumerate(semantic_rows):
            if row.id in chunks:
                chunks[row.id]["s_score"] = norm_s[idx]
            else:
                chunks[row.id] = {
                    "chunk_text": row.chunk_text,
                    "timestamp_start": row.timestamp_start,
                    "speaker_name": row.speaker_name,
                    "meeting_title": row.meeting_title,
                    "meeting_id": row.meeting_id,
                    "k_score": 0.0,
                    "s_score": norm_s[idx]
                }
                
        final_results = []
        for chunk_id, data in chunks.items():
            final_score = (0.6 * data["s_score"]) + (0.4 * data["k_score"])
            final_results.append(
                SearchResult(
                    chunk_text=data["chunk_text"],
                    timestamp_start=data["timestamp_start"],
                    speaker_name=data["speaker_name"],
                    meeting_title=data["meeting_title"],
                    meeting_id=data["meeting_id"],
                    final_score=final_score
                )
            )
            
        final_results.sort(key=lambda x: x.final_score, reverse=True)
        return final_results[:limit]

async def semantic_summary_search(
    query: str,
    org_id: UUID,
    limit: int = 10
) -> List[MeetingSummaryResult]:
    
    query_embedding = (await embed_texts([query]))[0]
    
    sql = """
        SELECT s.meeting_id, s.short_summary, m.title,
               1 - (s.summary_embedding <=> :query_embedding) as score
        FROM summaries s
        JOIN meetings m ON s.meeting_id = m.id
        WHERE s.organization_id = :org_id
        ORDER BY s.summary_embedding <=> :query_embedding
        LIMIT :limit
    """
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(sql), 
            {
                "org_id": org_id, 
                "query_embedding": str(query_embedding), 
                "limit": limit
            }
        )
        rows = result.fetchall()
        
        return [
            MeetingSummaryResult(
                meeting_id=r.meeting_id,
                title=r.title,
                short_summary=r.short_summary,
                score=r.score
            )
            for r in rows
        ]
