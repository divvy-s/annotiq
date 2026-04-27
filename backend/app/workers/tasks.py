import asyncio
import json
import uuid
from celery import shared_task
from app.workers.celery_app import celery_app
from app.db import AsyncSessionLocal
from sqlalchemy import select
from app.models.models import Meeting, TranscriptChunk, Summary, ActionItem
from app.services.embedding_service import embed_and_store_chunks, client

async def async_generate_intelligence(meeting_id_str: str):
    meeting_id = uuid.UUID(meeting_id_str)
    
    async with AsyncSessionLocal() as session:
        # Fetch meeting to get org_id
        stmt = select(Meeting).where(Meeting.id == meeting_id)
        result = await session.execute(stmt)
        meeting = result.scalars().first()
        
        if not meeting:
            raise ValueError(f"Meeting {meeting_id} not found")
            
        org_id = meeting.organization_id
        
        try:
            # Step A: Embed and store chunks
            await embed_and_store_chunks(meeting_id, org_id)
            
            # Fetch all chunks ordered by timestamp for summarization
            stmt = select(TranscriptChunk).where(
                TranscriptChunk.meeting_id == meeting_id,
                TranscriptChunk.organization_id == org_id
            ).order_by(TranscriptChunk.timestamp_start)
            result = await session.execute(stmt)
            chunks = result.scalars().all()
            
            full_transcript = "\n".join([c.chunk_text for c in chunks])
            
            if not full_transcript.strip():
                # No transcript to process
                meeting.status = "processed"
                await session.commit()
                return

            # Step B: Generate Summary
            summary_prompt = f"Summarize the following meeting transcript:\n\n{full_transcript}"
            summary_response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant that summarizes meetings. Respond in JSON format with keys 'short_summary' and 'detailed_summary'."},
                    {"role": "user", "content": summary_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            summary_data = json.loads(summary_response.choices[0].message.content)
            
            summary = Summary(
                meeting_id=meeting_id,
                organization_id=org_id,
                short_summary=summary_data.get('short_summary', ''),
                detailed_summary=summary_data.get('detailed_summary', '')
            )
            session.add(summary)
            
            # Step C: Generate Action Items
            action_items_prompt = f"Extract action items from the following meeting transcript:\n\n{full_transcript}"
            action_items_response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant that extracts action items. Respond in JSON format with a key 'action_items' containing a list of objects with keys 'assigned_to' (string or null), 'description' (string), and 'due_date' (YYYY-MM-DD or null)."},
                    {"role": "user", "content": action_items_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            ai_data = json.loads(action_items_response.choices[0].message.content)
            
            for item in ai_data.get('action_items', []):
                due_date_str = item.get('due_date')
                due_date = None
                if due_date_str:
                    from datetime import datetime
                    try:
                        due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
                    except ValueError:
                        pass
                        
                action_item = ActionItem(
                    meeting_id=meeting_id,
                    organization_id=org_id,
                    assigned_to=item.get('assigned_to'),
                    description=item.get('description', ''),
                    due_date=due_date,
                    status='open'
                )
                session.add(action_item)
                
            # Step D: Update meeting status
            meeting.status = "processed"
            
            await session.commit()
            
        except Exception as e:
            meeting.status = "failed"
            await session.commit()
            raise e

@celery_app.task(bind=True, max_retries=3)
def generate_intelligence(self, meeting_id: str):
    try:
        asyncio.run(async_generate_intelligence(meeting_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
