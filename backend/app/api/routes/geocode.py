"""World search and reverse geocoding (Nominatim, cached + throttled)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import District, State
from app.db.session import get_db
from app.providers.base import ProviderError
from app.providers.geocoding import get_geocoder
from app.schemas import NearestPlace, PlaceOut, ReverseResponse, SearchResponse
from app.services import india
from app.services.cache import cache_get, cache_key, cache_set

router = APIRouter(prefix="/geocode", tags=["geocoding"])

LANG_RE = r"^[a-z]{2}(-[A-Za-z]{2})?$"


@router.get("/search", response_model=SearchResponse)
async def search(
    q: Annotated[str, Query(min_length=2, max_length=200, description="Free-text place query (explicit submit only)")],
    limit: Annotated[int, Query(ge=1, le=20)] = 8,
    lang: Annotated[str, Query(pattern=LANG_RE)] = "en",
    country: Annotated[str | None, Query(pattern=r"^[a-z]{2}(,[a-z]{2})*$")] = None,
    db: Session = Depends(get_db),
):
    query = " ".join(q.split())
    params = {"q": query.lower(), "limit": limit, "lang": lang, "country": country}
    key = cache_key("nominatim:search", params)
    hit = cache_get(db, key)
    if hit:
        payload, created = hit
        return SearchResponse(query=query, results=payload, cached=True, fetched_at=created, provider="nominatim")
    results = await get_geocoder().search(query, limit=limit, lang=lang, countrycodes=country, viewbox=None)
    cache_set(db, key, "nominatim:search", results, timedelta(days=get_settings().GEOCODE_CACHE_DAYS))
    return SearchResponse(query=query, results=results, cached=False,
                          fetched_at=datetime.now(timezone.utc), provider="nominatim")


@router.get("/reverse", response_model=ReverseResponse)
async def reverse(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    zoom: Annotated[int, Query(ge=3, le=18)] = 16,
    lang: Annotated[str, Query(pattern=LANG_RE)] = "en",
    db: Session = Depends(get_db),
):
    # Round to ~11 m for the cache key only; coordinates are not logged or stored per user.
    params = {"lat": round(lat, 4), "lon": round(lon, 4), "zoom": zoom, "lang": lang}
    key = cache_key("nominatim:reverse", params)
    near = _nearest(db, lat, lon)
    hit = cache_get(db, key)
    if hit:
        payload, created = hit
        return ReverseResponse(lat=lat, lon=lon, result=payload or None, nearest_india_places=near, cached=True,
                               fetched_at=created, provider="nominatim")
    try:
        result = await get_geocoder().reverse(params["lat"], params["lon"], zoom=zoom, lang=lang)
    except ProviderError:
        if near:  # local dataset still answers "where is this?" inside India
            return ReverseResponse(lat=lat, lon=lon, result=None, nearest_india_places=near, cached=False,
                                   fetched_at=datetime.now(timezone.utc), provider="local-fallback")
        raise
    cache_set(db, key, "nominatim:reverse", result or {}, timedelta(days=get_settings().GEOCODE_CACHE_DAYS))
    return ReverseResponse(lat=lat, lon=lon, result=result, nearest_india_places=near, cached=False,
                           fetched_at=datetime.now(timezone.utc), provider="nominatim")


def _nearest(db: Session, lat: float, lon: float) -> list[NearestPlace]:
    out = []
    for place, dist in india.nearest(db, lat, lon, limit=3, max_km=60):
        d = db.get(District, place.district_id)
        s = db.get(State, place.state_code)
        out.append(NearestPlace(place=PlaceOut.model_validate(place), district=d.name if d else None,
                                state=s.name if s else None, distance_km=round(dist, 2)))
    return out
