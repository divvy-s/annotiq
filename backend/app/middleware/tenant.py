from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.services.auth_service import decode_token

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # We only want to enforce tenant isolation on protected API routes
        # For simplicity, let's assume any route starting with /api/ but NOT auth register/login
        if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/auth/register") and not request.url.path.startswith("/api/auth/login"):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Not authenticated"}
                )
            token = auth_header.split(" ")[1]
            try:
                payload = decode_token(token)
                org_id = payload.get("organization_id")
                if not org_id:
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Invalid token payload: missing organization_id"}
                    )
                # Inject into request state
                request.state.organization_id = org_id
                # Optionally cache the decoded payload to avoid re-decoding in deps
                request.state.jwt_payload = payload
            except Exception as e:
                # HTTPExceptions raised by decode_token will be caught here
                # but BaseHTTPMiddleware doesn't handle them perfectly, so we return a JSONResponse
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Could not validate credentials"}
                )
        
        response = await call_next(request)
        return response
