"""FastAPI application factory for the Locate U backend."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import account, extras, geocode, india, system
from app.core.config import PROJECT_DIR, get_settings
from app.core.middleware import RateLimitMiddleware, SecurityHeadersMiddleware
from app.providers.base import ProviderError

log = logging.getLogger("locate_u")
API_PREFIX = "/api/v1"


def _err(status: int, code: str, message: str, **extra) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message, **extra}, "detail": message}, status_code=status)


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    if s.AUTO_SETUP:
        from app.cli import ensure_ready

        try:
            ensure_ready()
        except Exception as exc:  # pragma: no cover - surfaced in logs and /health
            log.error("Automatic database setup failed: %s", exc)
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title=f"{s.APP_NAME} API",
        version=s.APP_VERSION,
        description=(
            "Backend for Locate U — a travel companion for India. World geocoding via Nominatim (cached, "
            "throttled), a validated India administrative dataset, saved locations and free preview providers."
        ),
        docs_url="/api/docs", redoc_url="/api/redoc", openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(RateLimitMiddleware, per_minute=s.RATE_LIMIT_PER_MINUTE)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware, allow_origins=s.cors_origins, allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )

    @app.exception_handler(ProviderError)
    async def provider_error(_: Request, exc: ProviderError):
        return _err(exc.status_code, exc.code, exc.message, provider=exc.provider)

    @app.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException):
        codes = {401: "unauthorized", 403: "forbidden", 404: "not_found", 409: "conflict", 422: "invalid_request"}
        resp = _err(exc.status_code, codes.get(exc.status_code, "http_error"), str(exc.detail))
        if exc.headers:
            resp.headers.update(exc.headers)
        return resp

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        fields = [{"loc": [str(x) for x in e.get("loc", [])], "msg": e.get("msg")} for e in exc.errors()]
        first = fields[0] if fields else {"loc": [], "msg": "Invalid request"}
        msg = f"{'.'.join(first['loc'][1:]) or 'request'}: {first['msg']}"
        return _err(422, "validation_error", msg, fields=fields)

    for r in (system.router, geocode.router, india.router, account.auth, account.saved, extras.router):
        app.include_router(r, prefix=API_PREFIX)

    _mount_frontend(app)
    return app


def _mount_frontend(app: FastAPI) -> None:
    """Serve the built PWA (frontend/dist) when present, for single-process deployments."""
    dist = Path(get_settings().FRONTEND_DIST or PROJECT_DIR / "frontend" / "dist")
    if not (dist / "index.html").exists():
        return
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        if path.startswith("api/"):
            return _err(404, "not_found", "Unknown API route")
        candidate = (dist / path).resolve()
        if path and candidate.is_file() and dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-cache"})


app = create_app()
