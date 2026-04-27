from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.middleware.tenant import TenantIsolationMiddleware
from app.api.auth import router as auth_router
from app.api.search import router as search_router
from app.db import engine, Base

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (use async engine)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Annotiq API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantIsolationMiddleware)
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(search_router, prefix="/api/search", tags=["search"])
@app.get("/")
async def root():
    return {"message": "Welcome to Annotiq API"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": "development"}
