"""Free, key-less "preview" providers: Open-Meteo weather, Wikipedia, Overpass.

All are optional (FEATURE_* settings), cached and throttled. None of them
require payment or an API key. Their responses are passed through as
provider data with attribution — the app never fabricates values.
"""
from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.providers.base import ProviderError, fetch_json, throttle_for

WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers",
    81: "Rain showers", 82: "Violent rain showers", 85: "Snow showers", 86: "Snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
}


async def weather(lat: float, lon: float) -> dict[str, Any]:
    s = get_settings()
    params = {
        "latitude": round(lat, 3), "longitude": round(lon, 3), "timezone": "auto", "forecast_days": 7,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    }
    data = await fetch_json("Open-Meteo", "GET", f"{s.OPEN_METEO_BASE_URL.rstrip('/')}/forecast", params=params,
                            throttle=throttle_for("open-meteo", 0.2))
    cur = data.get("current") or {}
    daily = data.get("daily") or {}
    days = []
    for i, d in enumerate(daily.get("time") or []):
        code = _at(daily, "weather_code", i)
        days.append({
            "date": d, "code": code, "summary": WMO_CODES.get(code, "—"),
            "t_max": _at(daily, "temperature_2m_max", i), "t_min": _at(daily, "temperature_2m_min", i),
            "precip_prob": _at(daily, "precipitation_probability_max", i),
            "sunrise": _at(daily, "sunrise", i), "sunset": _at(daily, "sunset", i),
            "uv_max": _at(daily, "uv_index_max", i),
        })
    return {
        "timezone": data.get("timezone"),
        "current": {
            "time": cur.get("time"), "temperature": cur.get("temperature_2m"),
            "feels_like": cur.get("apparent_temperature"), "humidity": cur.get("relative_humidity_2m"),
            "wind_speed": cur.get("wind_speed_10m"), "precipitation": cur.get("precipitation"),
            "code": cur.get("weather_code"), "summary": WMO_CODES.get(cur.get("weather_code"), "—"),
            "is_day": bool(cur.get("is_day", 1)),
        },
        "daily": days,
        "units": {"temperature": "°C", "wind_speed": "km/h", "precipitation": "mm"},
        "source": "open-meteo",
        "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)",
    }


def _at(d: dict, k: str, i: int):
    v = d.get(k) or []
    return v[i] if i < len(v) else None


async def wiki_nearby(lat: float, lon: float, lang: str = "en", radius: int = 10000, limit: int = 8) -> list[dict]:
    s = get_settings()
    base = s.WIKIPEDIA_BASE_URL.replace("en.wikipedia", f"{lang}.wikipedia")
    params = {
        "action": "query", "format": "json", "formatversion": 2, "generator": "geosearch",
        "ggscoord": f"{lat}|{lon}", "ggsradius": min(radius, 10000), "ggslimit": limit,
        "prop": "coordinates|pageimages|extracts|info", "inprop": "url", "exintro": 1, "explaintext": 1,
        "exsentences": 2, "exlimit": limit, "piprop": "thumbnail", "pithumbsize": 320, "colimit": limit,
    }
    data = await fetch_json("Wikipedia", "GET", f"{base}/w/api.php", params=params,
                            throttle=throttle_for("wikipedia", 0.1))
    pages = (data.get("query") or {}).get("pages") or []
    out = []
    for p in pages:
        coords = (p.get("coordinates") or [{}])[0]
        out.append({
            "title": p.get("title"), "extract": p.get("extract"), "url": p.get("fullurl"),
            "thumbnail": (p.get("thumbnail") or {}).get("source"),
            "lat": coords.get("lat"), "lon": coords.get("lon"), "index": p.get("index", 0),
        })
    out.sort(key=lambda x: x["index"])
    return out


async def wiki_summary(title: str, lang: str = "en") -> dict | None:
    s = get_settings()
    base = s.WIKIPEDIA_BASE_URL.replace("en.wikipedia", f"{lang}.wikipedia")
    from urllib.parse import quote

    try:
        data = await fetch_json("Wikipedia", "GET", f"{base}/api/rest_v1/page/summary/{quote(title, safe='')}",
                                throttle=throttle_for("wikipedia", 0.1))
    except ProviderError as e:
        if "404" in e.message:
            return None
        raise
    if data.get("type") == "disambiguation":
        return None
    return {
        "title": data.get("title"), "description": data.get("description"), "extract": data.get("extract"),
        "thumbnail": (data.get("thumbnail") or {}).get("source"),
        "url": ((data.get("content_urls") or {}).get("desktop") or {}).get("page"),
        "coordinates": data.get("coordinates"),
    }


# OSM tag filters per category. Only real OSM features are returned.
NEARBY_CATEGORIES: dict[str, dict[str, Any]] = {
    "hospital": {"label": "Hospitals & clinics", "filters": ['["amenity"~"^(hospital|clinic)$"]']},
    "pharmacy": {"label": "Pharmacies", "filters": ['["amenity"="pharmacy"]']},
    "police": {"label": "Police", "filters": ['["amenity"="police"]']},
    "atm": {"label": "ATMs & banks", "filters": ['["amenity"~"^(atm|bank)$"]']},
    "fuel": {"label": "Fuel & EV charging", "filters": ['["amenity"~"^(fuel|charging_station)$"]']},
    "toilets": {"label": "Public toilets", "filters": ['["amenity"="toilets"]']},
    "transit": {"label": "Rail & bus stations", "filters": ['["railway"="station"]', '["amenity"="bus_station"]']},
    "attraction": {"label": "Attractions", "filters": ['["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park)$"]', '["historic"~"^(monument|fort|castle|ruins|memorial)$"]']},
    "worship": {"label": "Places of worship", "filters": ['["amenity"="place_of_worship"]']},
    "food": {"label": "Restaurants & cafés", "filters": ['["amenity"~"^(restaurant|cafe|fast_food)$"]']},
    "stay": {"label": "Hotels & guest houses", "filters": ['["tourism"~"^(hotel|guest_house|hostel|motel)$"]']},
    "park": {"label": "Parks", "filters": ['["leisure"~"^(park|garden|nature_reserve)$"]']},
    "sports": {"label": "Sports facilities", "filters": ['["leisure"~"^(sports_centre|stadium|pitch|swimming_pool)$"]']},
}


async def nearby(lat: float, lon: float, category: str, radius: int) -> list[dict]:
    s = get_settings()
    cat = NEARBY_CATEGORIES[category]
    parts = "".join(f"nwr{f}(around:{radius},{lat},{lon});" for f in cat["filters"])
    query = f"[out:json][timeout:20];({parts});out center tags 60;"
    data = await fetch_json("Overpass", "POST", s.OVERPASS_URL, data={"data": query},
                            throttle=throttle_for("overpass", 1.0))
    out = []
    from app.services.geo import haversine_km

    for el in data.get("elements") or []:
        tags = el.get("tags") or {}
        la = el.get("lat") or (el.get("center") or {}).get("lat")
        lo = el.get("lon") or (el.get("center") or {}).get("lon")
        if la is None or lo is None:
            continue
        out.append({
            "id": f"osm:{el.get('type', 'x')[0].upper()}{el.get('id')}",
            "name": tags.get("name:en") or tags.get("name") or None,
            "lat": la, "lon": lo,
            "kind": next((tags[k] for k in ("amenity", "tourism", "historic", "leisure", "railway") if k in tags), None),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "website": tags.get("website") or tags.get("contact:website"),
            "opening_hours": tags.get("opening_hours"),
            "wheelchair": tags.get("wheelchair"),
            "address": ", ".join(x for x in (tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:city")) if x) or None,
            "distance_km": round(haversine_km(lat, lon, la, lo), 3),
        })
    out.sort(key=lambda x: x["distance_km"])
    return out
