from celery import Celery
import os

# You may also import the backend settings if you configure paths appropriately
broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "ai_meeting_worker",
    broker=broker_url,
    backend=broker_url
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def sample_task():
    return "Task completed"
