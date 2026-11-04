"""Health, public configuration and data-source metadata."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.providers.extras import NEARBY_CATEGORIES
from app.services import india
from app.services.cache import cache_stats

router = APIRouter(tags=["system"])

# Tile layers the frontend may offer. All are OSM-compatible services whose
# usage policies allow light, attributed use; none are satellite imagery.
MAP_LAYERS = [
    {
        "id": "osm", "name": "OpenStreetMap", "kind": "base", "max_zoom": 19,
        "attribution": '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        "policy": "https://operations.osmfoundation.org/policies/tiles/",
    },
    {
        "id": "osm-hot", "name": "Humanitarian", "kind": "base", "max_zoom": 19,
        "url": "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", "subdomains": "abc",
        "attribution": '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, '
                       'tiles style by <a href="https://www.hotosm.org/">HOT</a> hosted by OSM France',
        "policy": "https://wiki.openstreetmap.org/wiki/Humanitarian_map_style",
    },
    {
        "id": "topo", "name": "Topographic", "kind": "base", "max_zoom": 17,
        "url": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", "subdomains": "abc",
        "attribution": 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, '
                       'SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
        "policy": "https://opentopomap.org/about",
    },
    {
        "id": "cyclosm", "name": "CyclOSM", "kind": "base", "max_zoom": 19,
        "url": "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", "subdomains": "abc",
        "attribution": '<a href="https://www.cyclosm.org">CyclOSM</a> | Map data: &copy; '
                       '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        "policy": "https://www.cyclosm.org/",
    },
    {"id": "india-states", "name": "India state/UT boundaries", "kind": "overlay", "source": "local"},
    {"id": "india-districts", "name": "District boundaries (selected state)", "kind": "overlay", "source": "local"},
    {"id": "saved", "name": "Saved locations", "kind": "overlay", "source": "local"},
]


@router.get("/health")
def health(db: Session = Depends(get_db)):
    s = get_settings()
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:  # pragma: no cover - reported, not raised
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "app": s.APP_NAME, "version": s.APP_VERSION, "env": s.APP_ENV,
        "database": {"ok": db_ok, "dialect": db.bind.dialect.name if db.bind else None},
        "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


@router.get("/config")
def public_config():
    """Non-secret configuration for the frontend. Never returns API keys."""
    s = get_settings()
    layers = [dict(layer) for layer in MAP_LAYERS]
    layers[0]["url"] = s.OSM_TILE_URL
    return {
        "app_name": s.APP_NAME, "version": s.APP_VERSION,
        "map": {"provider": s.MAP_PROVIDER, "default_center": [22.5, 79.0], "default_zoom": 5, "layers": layers},
        "features": {"weather": s.FEATURE_WEATHER, "wikipedia": s.FEATURE_WIKIPEDIA, "nearby": s.FEATURE_NEARBY,
                     "accounts": True, "satellite": False, "offline_tiles": False, "ai": False},
        "nearby_categories": [{"id": k, "label": v["label"]} for k, v in NEARBY_CATEGORIES.items()],
        "geocoding": {"provider": "nominatim", "min_interval_seconds": s.NOMINATIM_MIN_INTERVAL_SECONDS,
                      "autocomplete": False, "cache_days": s.GEOCODE_CACHE_DAYS},
    }


@router.get("/meta/sources")
def sources(db: Session = Depends(get_db)):
    cov = india.coverage(db)
    return {
        "india_dataset": cov.get("manifest"),
        "last_import": cov.get("last_import"),
        "services": [
            {"name": "OpenStreetMap tiles", "use": "Base map", "license": "ODbL data; tile usage policy applies",
             "url": "https://operations.osmfoundation.org/policies/tiles/"},
            {"name": "Nominatim", "use": "World search & reverse geocoding (cached, 1 req/s)",
             "license": "ODbL data", "url": "https://operations.osmfoundation.org/policies/nominatim/"},
            {"name": "Overpass API", "use": "Nearby essentials (real OSM features)", "license": "ODbL data",
             "url": "https://wiki.openstreetmap.org/wiki/Overpass_API"},
            {"name": "Open-Meteo", "use": "Weather forecast (non-commercial free tier)", "license": "CC BY 4.0",
             "url": "https://open-meteo.com/en/terms"},
            {"name": "Wikipedia", "use": "Place summaries & nearby articles", "license": "CC BY-SA 4.0",
             "url": "https://foundation.wikimedia.org/wiki/Terms_of_Use"},
        ],
        "cache": cache_stats(db),
    }
