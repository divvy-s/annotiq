import os
from celery import Celery
from app.config import settings

celery_app = Celery(
    "ai_processing",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_BROKER_URL,
)

celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    result_backend=settings.CELERY_BROKER_URL,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
