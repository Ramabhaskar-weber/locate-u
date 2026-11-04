"""Geocoding provider abstraction with a Nominatim implementation.

Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
* max 1 request per second  → global ``Throttle``
* identify the application  → ``User-Agent`` (+ optional contact email)
* cache results             → ``ProviderCache`` (see services/geocode.py)
* no client-side autocomplete → the frontend only calls search on explicit submit
"""
from __future__ import annotations

from typing import Any, Protocol

from app.core.config import get_settings
from app.providers.base import fetch_json, throttle_for


class GeocodingProvider(Protocol):
    name: str

    async def search(self, q: str, *, limit: int, lang: str, countrycodes: str | None,
                     viewbox: str | None) -> list[dict[str, Any]]: ...

    async def reverse(self, lat: float, lon: float, *, zoom: int, lang: str) -> dict[str, Any] | None: ...


def _normalise(item: dict[str, Any]) -> dict[str, Any]:
    addr = item.get("address") or {}
    bbox = item.get("boundingbox")
    name = item.get("name") or (item.get("display_name") or "").split(",")[0]
    return {
        "id": f"osm:{(item.get('osm_type') or 'x')[0].upper()}{item.get('osm_id')}",
        "name": name or "Unnamed place",
        "display_name": item.get("display_name") or name,
        "lat": float(item["lat"]),
        "lon": float(item["lon"]),
        "category": item.get("category") or item.get("class"),
        "type": item.get("type") or item.get("addresstype"),
        "importance": item.get("importance"),
        "osm_type": item.get("osm_type"),
        "osm_id": item.get("osm_id"),
        # Nominatim bbox is [south, north, west, east]; normalise to [west, south, east, north]
        "bbox": [float(bbox[2]), float(bbox[0]), float(bbox[3]), float(bbox[1])] if bbox and len(bbox) == 4 else None,
        "address": {
            k: addr.get(k) for k in (
                "road", "neighbourhood", "suburb", "village", "town", "city", "municipality",
                "county", "state_district", "state", "postcode", "country", "country_code",
            ) if addr.get(k)
        },
        "source": "nominatim",
        "licence": item.get("licence") or "Data © OpenStreetMap contributors, ODbL 1.0",
    }


class NominatimProvider:
    name = "nominatim"

    def __init__(self) -> None:
        s = get_settings()
        self.base = s.NOMINATIM_BASE_URL.rstrip("/")
        self.email = s.NOMINATIM_EMAIL
        self.throttle = throttle_for("nominatim", s.NOMINATIM_MIN_INTERVAL_SECONDS)

    def _common(self, lang: str) -> dict[str, Any]:
        p: dict[str, Any] = {"format": "jsonv2", "addressdetails": 1, "accept-language": lang}
        if self.email:
            p["email"] = self.email
        return p

    async def search(self, q, *, limit=8, lang="en", countrycodes=None, viewbox=None):
        params = {**self._common(lang), "q": q, "limit": limit}
        if countrycodes:
            params["countrycodes"] = countrycodes
        if viewbox:
            params["viewbox"] = viewbox
        data = await fetch_json("Nominatim", "GET", f"{self.base}/search", params=params, throttle=self.throttle)
        return [_normalise(x) for x in data if "lat" in x and "lon" in x]

    async def reverse(self, lat, lon, *, zoom=18, lang="en"):
        params = {**self._common(lang), "lat": lat, "lon": lon, "zoom": zoom}
        data = await fetch_json("Nominatim", "GET", f"{self.base}/reverse", params=params, throttle=self.throttle)
        if not data or "error" in data:
            return None
        return _normalise(data)


def get_geocoder() -> GeocodingProvider:
    provider = get_settings().MAP_PROVIDER
    # Only OSM/Nominatim is implemented; other providers plug in here behind the same interface.
    if provider not in ("osm", "nominatim"):
        raise RuntimeError(f"Unsupported MAP_PROVIDER '{provider}'")
    return NominatimProvider()
