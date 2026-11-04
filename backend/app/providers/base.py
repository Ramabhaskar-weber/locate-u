"""Shared HTTP plumbing for external providers: throttling, errors, client."""
from __future__ import annotations

import asyncio
import time

import httpx

from app.core.config import get_settings


class ProviderError(Exception):
    def __init__(self, provider: str, message: str, status_code: int = 502, code: str = "provider_error"):
        super().__init__(message)
        self.provider = provider
        self.message = message
        self.status_code = status_code
        self.code = code


class Throttle:
    """Serialises calls so that at most one request starts per ``interval`` seconds."""

    def __init__(self, interval: float):
        self.interval = interval
        self._lock = asyncio.Lock()
        self._last = 0.0

    async def wait(self) -> None:
        async with self._lock:
            delay = self._last + self.interval - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)
            self._last = time.monotonic()


_throttles: dict[str, Throttle] = {}


def throttle_for(name: str, interval: float) -> Throttle:
    t = _throttles.get(name)
    if t is None or t.interval != interval:
        t = _throttles[name] = Throttle(interval)
    return t


def reset_throttles() -> None:
    _throttles.clear()


async def fetch_json(provider: str, method: str, url: str, *, params=None, data=None,
                     throttle: Throttle | None = None, headers: dict | None = None):
    s = get_settings()
    if throttle:
        await throttle.wait()
    hdrs = {"User-Agent": s.user_agent, "Accept": "application/json", **(headers or {})}
    try:
        async with httpx.AsyncClient(timeout=s.HTTP_TIMEOUT_SECONDS, headers=hdrs) as client:
            resp = await client.request(method, url, params=params, data=data)
    except httpx.TimeoutException as exc:
        raise ProviderError(provider, f"{provider} did not respond in time", 504, "provider_timeout") from exc
    except httpx.HTTPError as exc:
        raise ProviderError(provider, f"Could not reach {provider}", 503, "provider_unreachable") from exc
    if resp.status_code == 429:
        raise ProviderError(provider, f"{provider} rate limit reached — try again shortly", 503, "provider_rate_limited")
    if resp.status_code >= 400:
        raise ProviderError(provider, f"{provider} returned HTTP {resp.status_code}", 502)
    try:
        return resp.json()
    except ValueError as exc:
        raise ProviderError(provider, f"{provider} returned an invalid response", 502) from exc
