from fastapi import FastAPI
from app.config import settings

from app.middleware.tenant import TenantIsolationMiddleware
from app.api.auth import router as auth_router

app = FastAPI(
    title="AI Meeting Intelligence Platform API",
    version="0.1.0",
)

app.add_middleware(TenantIsolationMiddleware)
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "Welcome to AI Meeting Intelligence Platform API"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": "development"}
