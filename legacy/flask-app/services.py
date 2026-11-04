from __future__ import annotations

import math
import os
import re
from contextlib import closing
from typing import Any

import requests

from database import get_db


CATEGORY_TYPES = {
    "hotel": ["hotel", "resort_hotel", "lodging"],
    "restaurant": ["restaurant", "cafe", "bakery"],
    "transport": ["airport", "bus_station", "train_station", "subway_station", "transit_station"],
    "attraction": ["tourist_attraction", "museum", "park", "hindu_temple"],
    "health": ["hospital", "pharmacy"],
    "public_services": ["public_bathroom", "atm", "police", "gas_station", "parking", "drinking_water"],
}


def haversine_km(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    radius_km = 6371.0
    phi_a, phi_b = math.radians(lat_a), math.radians(lat_b)
    delta_phi = math.radians(lat_b - lat_a)
    delta_lambda = math.radians(lon_b - lon_a)
    value = math.sin(delta_phi / 2) ** 2 + math.cos(phi_a) * math.cos(phi_b) * math.sin(delta_lambda / 2) ** 2
    return 2 * radius_km * math.asin(min(1.0, math.sqrt(value)))


def list_local_places(*, query: str = "", category: str = "", lat: float | None = None,
                      lng: float | None = None, max_distance: float | None = None,
                      min_rating: float | None = None, sort: str = "recommended",
                      preference_categories: list[str] | None = None) -> list[dict[str, Any]]:
    conditions: list[str] = []
    params: list[Any] = []
    if query:
        conditions.append("(name LIKE ? OR description LIKE ? OR address LIKE ?)")
        term = f"%{query[:100]}%"
        params.extend([term, term, term])
    if category:
        conditions.append("category = ?")
        params.append(category)
    if min_rating is not None:
        conditions.append("rating >= ?")
        params.append(min_rating)
    sql = "SELECT * FROM places" + (" WHERE " + " AND ".join(conditions) if conditions else "")
    with closing(get_db()) as connection:
        rows = [dict(row) for row in connection.execute(sql, params).fetchall()]

    if not rows and category and query:
        fallback_sql = "SELECT * FROM places WHERE category = ?"
        with closing(get_db()) as connection:
            rows = [dict(row) for row in connection.execute(fallback_sql, (category,)).fetchall()]

    rated = [float(row["rating"]) for row in rows if row["rating"] is not None]
    max_reviews = max((int(row["review_count"] or 0) for row in rows), default=0)
    prefs = set(preference_categories or [])
    for row in rows:
        distance = haversine_km(lat, lng, row["latitude"], row["longitude"]) if lat is not None and lng is not None else None
        row["distance_km"] = round(distance, 1) if distance is not None else None
        if max_distance is not None and distance is not None and distance > max_distance:
            row["_excluded"] = True
            continue
        components: list[tuple[float, float]] = []
        if distance is not None:
            components.append((0.35, max(0.0, 1 - min(distance, 100) / 100)))
        if row["rating"] is not None:
            components.append((0.30, float(row["rating"]) / 5))
        if category:
            components.append((0.20, 1.0 if row["category"] == category else 0.0))
        elif prefs:
            components.append((0.20, 1.0 if row["category"] in prefs else 0.0))
        if row["review_count"] is not None and max_reviews:
            components.append((0.15, math.log1p(row["review_count"]) / math.log1p(max_reviews)))
        total_weight = sum(weight for weight, _ in components)
        row["recommendation_score"] = round(100 * sum(weight * score for weight, score in components) / total_weight, 1) if total_weight else None
        row["score_explanation"] = "Distance, rating, category match and review count; unavailable data is excluded."
    rows = [row for row in rows if not row.get("_excluded")]
    if sort == "nearest":
        rows.sort(key=lambda row: (row["distance_km"] is None, row["distance_km"] or float("inf")))
    elif sort == "rating":
        rows.sort(key=lambda row: (row["rating"] is None, -(row["rating"] or 0)))
    else:
        rows.sort(key=lambda row: (row["recommendation_score"] is None, -(row["recommendation_score"] or 0)))
    return rows


def google_nearby(*, lat: float, lng: float, radius_m: int, category: str = "") -> tuple[list[dict[str, Any]], str | None]:
    key = os.getenv("GOOGLE_MAPS_SERVER_KEY", "").strip()
    if not key:
        return [], "Google Places is not configured; nearby provider results are unavailable."
    body: dict[str, Any] = {
        "locationRestriction": {"circle": {"center": {"latitude": lat, "longitude": lng}, "radius": radius_m}},
        "maxResultCount": 20,
        "rankPreference": "DISTANCE",
    }
    types = CATEGORY_TYPES.get(category)
    if types:
        body["includedTypes"] = types
    try:
        response = requests.post(
            "https://places.googleapis.com/v1/places:searchNearby",
            json=body,
            headers={"Content-Type": "application/json", "X-Goog-Api-Key": key,
                     "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,places.photos"},
            timeout=8,
        )
        response.raise_for_status()
        results = []
        for place in response.json().get("places", []):
            location = place.get("location", {})
            name = place.get("displayName", {}).get("text", "Nearby place")
            photo = next(iter(place.get("photos", [])), {})
            results.append({
                "google_place_id": place.get("id"), "name": name,
                "category": place.get("primaryType", category or "place"),
                "address": place.get("formattedAddress", ""),
                "latitude": location.get("latitude"), "longitude": location.get("longitude"),
                "rating": place.get("rating"), "review_count": place.get("userRatingCount"),
                "website": place.get("websiteUri"), "phone": place.get("nationalPhoneNumber"),
                "opening_hours": "; ".join(place.get("regularOpeningHours", {}).get("weekdayDescriptions", [])),
                "photo_url": f"/api/google-photos?name={photo['name']}" if photo.get("name") else None,
                "photo_attributions": photo.get("authorAttributions", []),
                "source": "Google Places API (New)", "verified": 1,
            })
        return results, None
    except (requests.RequestException, ValueError) as error:
        return [], f"Places search is temporarily unavailable ({type(error).__name__}); no provider results are shown."


def get_google_photo(photo_name: str) -> tuple[bytes | None, str | None, str | None]:
    key = os.getenv("GOOGLE_MAPS_SERVER_KEY", "").strip()
    if not key:
        return None, None, "Google Places is not configured."
    if not re.fullmatch(r"places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+", photo_name):
        return None, None, "Invalid photo reference."
    try:
        response = requests.get(
            f"https://places.googleapis.com/v1/{photo_name}/media",
            params={"maxWidthPx": 1000, "key": key}, timeout=8,
        )
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
        if not content_type.startswith("image/") or len(response.content) > 8 * 1024 * 1024:
            return None, None, "The photo response was not a supported image."
        return response.content, content_type, None
    except requests.RequestException:
        return None, None, "The photo is temporarily unavailable."


def geocode_address(address: str) -> tuple[dict[str, Any] | None, str | None]:
    key = os.getenv("GOOGLE_MAPS_SERVER_KEY", "").strip()
    if not key:
        return None, "Geocoding is not configured. Add a restricted server key to GOOGLE_MAPS_SERVER_KEY."
    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address[:200], "key": key}, timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "OK" or not payload.get("results"):
            return None, "No matching address was found."
        result = payload["results"][0]
        point = result["geometry"]["location"]
        return {
            "address": result.get("formatted_address", address),
            "latitude": point["lat"],
            "longitude": point["lng"],
            "address_components": result.get("address_components", []),
        }, None
    except (requests.RequestException, ValueError, KeyError) as error:
        return None, f"Geocoding is temporarily unavailable ({type(error).__name__})."


def reverse_geocode(lat: float, lng: float) -> tuple[dict[str, Any] | None, str | None]:
    key = os.getenv("GOOGLE_MAPS_SERVER_KEY", "").strip()
    if not key:
        return None, "Reverse geocoding is not configured. Add a restricted server key to GOOGLE_MAPS_SERVER_KEY."
    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"latlng": f"{lat},{lng}", "key": key}, timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "OK" or not payload.get("results"):
            return None, "No address is available for this map point."
        result = payload["results"][0]
        return {
            "address": result.get("formatted_address", ""),
            "address_components": result.get("address_components", []),
        }, None
    except (requests.RequestException, ValueError, KeyError) as error:
        return None, f"Reverse geocoding is temporarily unavailable ({type(error).__name__})."
