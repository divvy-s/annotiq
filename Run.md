# 🚀 Running the Annotiq Platform

A step-by-step guide to getting every service running — locally or via Docker Compose.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Option A — Run Locally (No Docker)](#option-a--run-locally-no-docker)
  - [1. Redis](#1-redis)
  - [2. Backend (FastAPI)](#2-backend-fastapi)
  - [3. Celery Worker](#3-celery-worker)
  - [4. Frontend (Next.js)](#4-frontend-nextjs)
- [Option B — Run with Docker Compose](#option-b--run-with-docker-compose)
- [Running Tests](#running-tests)
- [Database Migrations](#database-migrations)
- [Useful URLs](#useful-urls)
- [Environment Variable Reference](#environment-variable-reference)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │─────▶│   Backend    │─────▶│  Supabase /  │
│  Next.js 14  │ :3000│  FastAPI     │ :8000│  PostgreSQL  │
│  React Query │      │  SQLAlchemy  │      │  + pgvector  │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                             │ Task Queue
                             ▼
                      ┌──────────────┐      ┌──────────────┐
                      │    Redis     │◀─────│   Celery     │
                      │   Broker     │ :6379│   Workers    │
                      └──────────────┘      └──────────────┘
                                                   │
                                            ┌──────┴───────┐
                                            │   OpenAI     │
                                            │ Embeddings + │
                                            │  Summaries   │
                                            └──────────────┘
```

| Service       | Technology               | Default Port |
|---------------|--------------------------|--------------|
| Frontend      | Next.js 14, Tailwind CSS | 3000         |
| Backend API   | FastAPI, SQLAlchemy      | 8000         |
| Task Queue    | Redis                    | 6379         |
| Async Workers | Celery (Python)          | —            |
| Database      | Supabase PostgreSQL      | 5432 / 6543  |

---

## Prerequisites

| Tool       | Minimum Version | Installation                                           |
|------------|-----------------|--------------------------------------------------------|
| Python     | 3.10+           | [python.org](https://www.python.org/downloads/)        |
| Node.js    | 18+             | [nodejs.org](https://nodejs.org/)                      |
| npm        | 9+              | Bundled with Node.js                                   |
| Redis      | 6+              | `sudo pacman -S redis` / `brew install redis` / Docker |
| Git        | 2.30+           | Pre-installed on most systems                          |

> [!NOTE]
> **Supabase** is used as the hosted PostgreSQL database with `pgvector` enabled. You need a [Supabase project](https://supabase.com/) to run the backend. Alternatively, you can spin up a local PostgreSQL 15+ instance with the `pgvector` extension.

---

## Environment Variables

Every service has its own `.env.example` file. Copy each one and fill in your real values before starting.

```bash
# From the project root:
cp backend/.env.example   backend/.env
cp frontend/.env.example  frontend/.env
cp workers/.env.example   workers/.env
```

> [!CAUTION]
> **Never commit `.env` files.** They are already in `.gitignore`. Only `.env.example` files (with placeholder values) are tracked.

See the full [Environment Variable Reference](#environment-variable-reference) at the bottom of this document.

---

## Option A — Run Locally (No Docker)

Open **four terminal windows** (one for each service).

### 1. Redis

Start Redis as a background service:

```bash
# Linux (systemd)
sudo systemctl start redis

# macOS (Homebrew)
brew services start redis

# Or run it directly in foreground
redis-server
```

Verify it's running:

```bash
redis-cli ping
# Expected: PONG
```

---

### 2. Backend (FastAPI)

```bash
cd backend

# Create a virtual environment (first time only)
python -m venv venv

# Activate the virtual environment
source venv/bin/activate        # Linux / macOS
# .\venv\Scripts\activate       # Windows PowerShell

# Install dependencies (first time only)
pip install -e .

# Copy and fill environment variables (first time only)
cp .env.example .env
# Edit .env with your real credentials

# Run database migrations
alembic upgrade head

# Start the API server with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at **http://localhost:8000**.  
Interactive docs at **http://localhost:8000/docs**.

---

### 3. Celery Worker

In a new terminal (with the backend venv activated):

```bash
cd backend
source venv/bin/activate

# Start the Celery worker
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

> [!TIP]
> For development, add `--autoreload` (requires `watchdog` pip package) so the worker restarts when you change Python files:
> ```bash
> pip install watchdog
> watchmedo auto-restart --directory=./app --pattern="*.py" --recursive -- \
>   celery -A app.workers.celery_app.celery_app worker --loglevel=info
> ```

---

### 4. Frontend (Next.js)

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Copy and fill environment variables (first time only)
cp .env.example .env
# Edit .env if your backend is not on localhost:8000

# Start the dev server with hot reload
npm run dev
```

The frontend will be live at **http://localhost:3000**.

---

## Option B — Run with Docker Compose

This method starts **Redis**, **Backend**, and **Celery Worker** in containers. The frontend still runs locally for the best DX (hot module replacement).

### 1. Prepare environment

```bash
# Fill in the backend env (Docker Compose mounts this file)
cp backend/.env.example backend/.env
# Edit backend/.env with your real credentials

cp frontend/.env.example frontend/.env
```

### 2. Start infrastructure + backend services

```bash
cd infra
docker compose up --build -d
```

This starts:
- **redis** on port 6379
- **backend** on port 8000 (with hot reload via volume mount)
- **worker** (Celery) connected to the Redis broker

Check the logs:

```bash
docker compose logs -f backend
docker compose logs -f worker
```

### 3. Start the frontend

```bash
cd frontend
npm install   # first time only
npm run dev
```

### 4. Tear down

```bash
cd infra
docker compose down           # Stop containers
docker compose down -v        # Stop and remove volumes (Redis data)
```

---

## Running Tests

### Backend Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
python -m pytest

# Run with verbose output
python -m pytest -v

# Run a specific test file
python -m pytest tests/test_auth.py -v
```

> [!NOTE]
> Integration tests use an in-memory SQLite database by default. Semantic search tests that depend on `pgvector` require a live PostgreSQL connection.

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run a specific test file
npm test -- __tests__/upload.test.tsx

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

**Test suites:**

| File                       | What it tests                                                |
|----------------------------|--------------------------------------------------------------|
| `upload.test.tsx`          | Upload sends correct FormData, redirect after upload         |
| `meeting-detail.test.tsx`  | Polling stops on `processed`, speaker rename, action items   |
| `search.test.tsx`          | Debounce, keyword highlighting, empty state, meeting filter  |

---

## Database Migrations

Annotiq uses [Alembic](https://alembic.sqlalchemy.org/) for database migrations.

```bash
cd backend
source venv/bin/activate

# Apply all pending migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# Downgrade one revision
alembic downgrade -1

# View migration history
alembic history --verbose
```

> [!IMPORTANT]
> After changing any SQLAlchemy model in `app/models/models.py`, always generate a new migration and test it before deploying.

---

## Useful URLs

| URL                              | Description              |
|----------------------------------|--------------------------|
| http://localhost:3000             | Frontend (Next.js)       |
| http://localhost:3000/search      | Semantic Search UI       |
| http://localhost:3000/meetings/upload | Meeting Upload Page  |
| http://localhost:8000             | Backend API root         |
| http://localhost:8000/docs        | Swagger / OpenAPI docs   |
| http://localhost:8000/health      | Health check endpoint    |

---

## Environment Variable Reference

### Backend (`backend/.env`)

| Variable                 | Required | Default                      | Description                                          |
|--------------------------|----------|------------------------------|------------------------------------------------------|
| `SUPABASE_URL`           | ✅       | —                            | Your Supabase project URL                            |
| `SUPABASE_ANON_KEY`      | ✅       | —                            | Supabase public anon key                             |
| `SUPABASE_SERVICE_KEY`   | ✅       | —                            | Supabase secret service role key                     |
| `DATABASE_URL`           | ✅       | —                            | PostgreSQL connection string                         |
| `OPENAI_API_KEY`         | ✅       | —                            | OpenAI API key for embeddings + summaries            |
| `CLOUDINARY_CLOUD_NAME`  | ✅       | —                            | Cloudinary cloud name for media storage              |
| `CLOUDINARY_API_KEY`     | ✅       | —                            | Cloudinary API key                                   |
| `CLOUDINARY_API_SECRET`  | ✅       | —                            | Cloudinary API secret                                |
| `JWT_SECRET_KEY`         | ✅       | —                            | 256-bit hex secret for signing JWTs                  |
| `JWT_ALGORITHM`          | ❌       | `HS256`                      | JWT signing algorithm                                |
| `JWT_EXPIRE_MINUTES`     | ❌       | `60`                         | JWT token expiration time in minutes                 |
| `CELERY_BROKER_URL`      | ❌       | `redis://localhost:6379/0`   | Redis URL for Celery task broker                     |

### Frontend (`frontend/.env`)

| Variable               | Required | Default                 | Description                               |
|------------------------|----------|-------------------------|-------------------------------------------|
| `NEXT_PUBLIC_API_URL`  | ✅       | `http://localhost:8000` | URL of the FastAPI backend                |

### Workers (`workers/.env`)

| Variable               | Required | Default                    | Description                                |
|------------------------|----------|----------------------------|--------------------------------------------|
| `CELERY_BROKER_URL`    | ❌       | `redis://localhost:6379/0` | Redis URL for Celery task broker           |

> [!TIP]
> **Generate a JWT secret** with this one-liner:
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## Troubleshooting

### `getaddrinfo failed` when connecting to Supabase

Your Supabase project may be IPv6-only. Use the **Connection Pooling** URL (port `6543`) instead of the direct URL (port `5432`). You can find this in your Supabase dashboard under **Settings → Database → Connection string → Connection pooling**.

### `role "postgres" does not exist` or similar DB auth errors

Double-check your `DATABASE_URL` in `backend/.env`. The connection string format should be:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### `ECONNREFUSED` on the frontend

Ensure the backend is running on the port specified by `NEXT_PUBLIC_API_URL` (default `8000`). If you changed the backend port, update the frontend `.env` to match.

### Redis connection refused

Ensure Redis is running:
```bash
redis-cli ping
# Expected: PONG
```
If using Docker Compose, the worker connects to `redis://redis:6379/0` (the Docker service name), not `localhost`.

### Frontend tests fail with `Cannot find module`

Run `npm install` in the `frontend/` directory to ensure all dependencies are present.

### Alembic migration errors

If you get `Target database is not up to date`, run:
```bash
cd backend
alembic upgrade head
```
If migrations are broken, you can stamp the current state:
```bash
alembic stamp head
```
