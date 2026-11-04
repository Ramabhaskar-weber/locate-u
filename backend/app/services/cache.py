"""Database-backed cache for third-party provider responses."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import ProviderCache


def cache_key(provider: str, params: dict[str, Any]) -> str:
    raw = provider + "|" + json.dumps(params, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def cache_get(db: Session, key: str) -> tuple[Any, datetime] | None:
    row = db.get(ProviderCache, key)
    if row is None:
        return None
    if _aware(row.expires_at) < datetime.now(timezone.utc):
        return None
    row.hits = (row.hits or 0) + 1
    db.commit()
    return row.payload, _aware(row.created_at)


def cache_set(db: Session, key: str, provider: str, payload: Any, ttl: timedelta) -> None:
    now = datetime.now(timezone.utc)
    row = db.get(ProviderCache, key)
    if row is None:
        row = ProviderCache(key=key, provider=provider)
        db.add(row)
    row.payload = payload
    row.created_at = now
    row.expires_at = now + ttl
    db.commit()


def cache_purge_expired(db: Session) -> int:
    res = db.execute(delete(ProviderCache).where(ProviderCache.expires_at < datetime.now(timezone.utc)))
    db.commit()
    return res.rowcount or 0


def cache_stats(db: Session) -> dict[str, int]:
    rows = db.execute(select(ProviderCache.provider)).scalars().all()
    out: dict[str, int] = {}
    for p in rows:
        out[p] = out.get(p, 0) + 1
    return out
