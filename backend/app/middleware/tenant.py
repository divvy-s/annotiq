from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.services.auth_service import decode_token

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Bypass middleware for CORS preflight (OPTIONS) requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # 2. Define routes that do not require authentication
        path = request.url.path
        public_paths = [
            "/api/auth/register",
            "/api/auth/login",
            "/health",
            "/"
        ]

        # 3. Apply isolation logic only to protected /api/ routes
        if path.startswith("/api/") and not any(path.startswith(p) for p in public_paths):
            auth_header = request.headers.get("Authorization")
            
            # Check for missing or malformed header
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Not authenticated"}
                )

            token = auth_header.split(" ")[1]
            
            try:
                # Decode and validate the JWT
                payload = decode_token(token)
                org_id = payload.get("organization_id")

                if not org_id:
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Invalid token payload: missing organization_id"}
                    )

                # Inject tenant info into request state for use in routes/dependencies
                request.state.organization_id = org_id
                request.state.jwt_payload = payload

            except Exception as e:
                # Catch expiration or signature errors from decode_token
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": f"Could not validate credentials: {str(e)}"}
                )

        # 4. Proceed to the next middleware or route handler
        response = await call_next(request)
        return response