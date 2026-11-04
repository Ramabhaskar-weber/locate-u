"""Security headers, request IDs and a simple per-IP rate limiter."""
from __future__ import annotations

import time
import uuid
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        response = await call_next(request)
        h = response.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        # The app itself may ask for location (only on user action); embeds and other features are denied.
        h.setdefault("Permissions-Policy", "geolocation=(self), camera=(), microphone=(), payment=(), usb=()")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        h["X-Request-ID"] = request_id
        if request.url.path.startswith("/api/") and "cache-control" not in h:
            h["Cache-Control"] = "no-store"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window limiter, process-local. Use a shared store (Redis) for multi-worker deployments."""

    def __init__(self, app, per_minute: int = 120, exempt: tuple[str, ...] = ("/api/v1/health",)):
        super().__init__(app)
        self.per_minute = per_minute
        self.exempt = exempt
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if self.per_minute <= 0 or not path.startswith("/api/") or path in self.exempt:
            return await call_next(request)
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        q = self.hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= self.per_minute:
            retry = max(1, int(60 - (now - q[0])))
            return JSONResponse(
                {"error": {"code": "rate_limited", "message": "Too many requests. Please slow down."}},
                status_code=429, headers={"Retry-After": str(retry)},
            )
        q.append(now)
        return await call_next(request)
