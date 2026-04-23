FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/
COPY backend/app backend/app
COPY workers workers

RUN cd backend && pip install -e .

CMD ["celery", "-A", "workers.celery_worker.celery_app", "worker", "--loglevel=info"]
