"""Preview features beyond Stage 1, all using free key-less providers."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.providers import extras
from app.services.cache import cache_get, cache_key, cache_set

router = APIRouter(tags=["preview: weather, wikipedia, nearby"])
LAT = Annotated[float, Query(ge=-90, le=90)]
LON = Annotated[float, Query(ge=-180, le=180)]
LANG = Annotated[str, Query(pattern=r"^[a-z]{2}$")]


def _require(flag: bool, name: str) -> None:
    if not flag:
        raise HTTPException(404, f"{name} is disabled on this server")


async def _cached(db: Session, provider: str, params: dict, ttl: timedelta, fn):
    key = cache_key(provider, params)
    hit = cache_get(db, key)
    if hit:
        return {"data": hit[0], "cached": True, "fetched_at": hit[1].isoformat()}
    data = await fn()
    cache_set(db, key, provider, data, ttl)
    return {"data": data, "cached": False, "fetched_at": datetime.now(timezone.utc).isoformat()}


@router.get("/weather")
async def weather(lat: LAT, lon: LON, db: Session = Depends(get_db)):
    _require(get_settings().FEATURE_WEATHER, "Weather")
    la, lo = round(lat, 2), round(lon, 2)
    return await _cached(db, "open-meteo", {"lat": la, "lon": lo}, timedelta(minutes=30),
                         lambda: extras.weather(la, lo))


@router.get("/wiki/nearby")
async def wiki_nearby(lat: LAT, lon: LON, lang: LANG = "en",
                      radius: Annotated[int, Query(ge=100, le=10000)] = 10000, db: Session = Depends(get_db)):
    _require(get_settings().FEATURE_WIKIPEDIA, "Wikipedia")
    la, lo = round(lat, 3), round(lon, 3)
    return await _cached(db, "wikipedia:nearby", {"lat": la, "lon": lo, "lang": lang, "r": radius},
                         timedelta(days=7), lambda: extras.wiki_nearby(la, lo, lang, radius))


@router.get("/wiki/summary")
async def wiki_summary(title: Annotated[str, Query(min_length=1, max_length=200)], lang: LANG = "en",
                       db: Session = Depends(get_db)):
    _require(get_settings().FEATURE_WIKIPEDIA, "Wikipedia")
    return await _cached(db, "wikipedia:summary", {"t": title, "lang": lang}, timedelta(days=7),
                         lambda: extras.wiki_summary(title, lang))


@router.get("/nearby")
async def nearby(lat: LAT, lon: LON, category: Annotated[str, Query(max_length=20)],
                 radius: Annotated[int, Query(ge=100, le=5000)] = 2000, db: Session = Depends(get_db)):
    _require(get_settings().FEATURE_NEARBY, "Nearby search")
    if category not in extras.NEARBY_CATEGORIES:
        raise HTTPException(422, f"Unknown category. Use one of: {', '.join(extras.NEARBY_CATEGORIES)}")
    la, lo = round(lat, 3), round(lon, 3)
    res = await _cached(db, "overpass", {"lat": la, "lon": lo, "c": category, "r": radius}, timedelta(days=1),
                        lambda: extras.nearby(la, lo, category, radius))
    res["attribution"] = "© OpenStreetMap contributors (ODbL) via Overpass API"
    res["category"] = {"id": category, "label": extras.NEARBY_CATEGORIES[category]["label"]}
    return res
