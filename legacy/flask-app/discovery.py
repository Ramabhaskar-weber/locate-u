from __future__ import annotations

import json
from contextlib import closing

from flask import Blueprint, Response, current_app, flash, jsonify, render_template, request
from flask_login import current_user, login_required

from database import get_db
from services import geocode_address, get_google_photo, google_nearby, list_local_places, reverse_geocode


discovery_bp = Blueprint("discovery", __name__)


def _preferences() -> list[str]:
    if not current_user.is_authenticated:
        return []
    with closing(get_db()) as connection:
        row = connection.execute("SELECT categories FROM user_preferences WHERE user_id = ?", (current_user.id,)).fetchone()
    try:
        return json.loads(row["categories"]) if row else []
    except (TypeError, json.JSONDecodeError):
        return []


@discovery_bp.get("/")
def index():
    places = list_local_places(sort="recommended", preference_categories=_preferences())[:6]
    return render_template("index.html", places=places, maps_key=current_app.config["GOOGLE_MAPS_BROWSER_KEY"])


@discovery_bp.get("/accommodations", endpoint="accommodations")
def accommodations():
    city = (request.args.get("city") or "Andhra Pradesh").strip()
    query = (request.args.get("q") or city).strip()
    places = list_local_places(query=query, category="hotel", sort=request.args.get("sort", "rating"), preference_categories=_preferences())
    return render_template("accommodations.html", places=places, city=city, selected_sort=request.args.get("sort", "rating"))


@discovery_bp.get("/food", endpoint="food")
def food_discovery():
    city = (request.args.get("city") or "Andhra Pradesh").strip()
    query = (request.args.get("q") or city).strip()
    places = list_local_places(query=query, category="restaurant", sort=request.args.get("sort", "rating"), preference_categories=_preferences())
    return render_template("food.html", places=places, city=city, selected_sort=request.args.get("sort", "rating"))


@discovery_bp.get("/transport", endpoint="transport")
def transport_hub():
    city = (request.args.get("city") or "Andhra Pradesh").strip()
    query = (request.args.get("q") or city).strip()
    places = list_local_places(query=query, category="transport", sort=request.args.get("sort", "rating"), preference_categories=_preferences())
    return render_template("transport.html", places=places, city=city, selected_sort=request.args.get("sort", "rating"))


@discovery_bp.get("/destinations")
def destinations():
    places = list_local_places(category=request.args.get("category", ""), sort=request.args.get("sort", "recommended"), preference_categories=_preferences())
    return render_template("destinations.html", places=places, selected_category=request.args.get("category", ""))


@discovery_bp.get("/places/<int:place_id>")
def place_details(place_id: int):
    with closing(get_db()) as connection:
        place = connection.execute("SELECT * FROM places WHERE id = ?", (place_id,)).fetchone()
    if not place:
        return render_template("place_details.html", place=None), 404
    return render_template("place_details.html", place=place)


@discovery_bp.get("/api/search")
def search_api():
    query = request.args.get("q", "").strip()[:100]
    category = request.args.get("category", "")[:40]
    sort = request.args.get("sort", "recommended")
    if sort not in {"recommended", "nearest", "rating"}:
        return jsonify(error="Unsupported sort option."), 400
    try:
        lat = float(request.args["lat"]) if request.args.get("lat") else None
        lng = float(request.args["lng"]) if request.args.get("lng") else None
        max_distance = min(500.0, max(0.1, float(request.args["distance"]))) if request.args.get("distance") else None
        min_rating = min(5.0, max(0.0, float(request.args["rating"]))) if request.args.get("rating") else None
        if (lat is None) != (lng is None) or (lat is not None and not (-90 <= lat <= 90 and -180 <= lng <= 180)):
            raise ValueError
    except ValueError:
        return jsonify(error="Invalid location or filter value."), 400
    if current_user.is_authenticated and query:
        with closing(get_db()) as connection:
            connection.execute("INSERT INTO search_history (user_id, query, category) VALUES (?, ?, ?)", (current_user.id, query, category or None))
            connection.commit()
    places = list_local_places(query=query, category=category, lat=lat, lng=lng, max_distance=max_distance, min_rating=min_rating, sort=sort, preference_categories=_preferences())
    return jsonify(places=places, count=len(places), score_note="Scores only use available rating, distance, category and review data; missing fields are omitted.")


@discovery_bp.get("/api/history")
@login_required
def search_history():
    with closing(get_db()) as connection:
        rows = connection.execute("SELECT query, category, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", (current_user.id,)).fetchall()
    return jsonify(history=[dict(row) for row in rows])


@discovery_bp.post("/api/places/nearby")
def nearby_places():
    data = request.get_json(silent=True) or {}
    try:
        lat, lng = float(data.get("lat")), float(data.get("lng"))
        radius = min(50000, max(100, int(data.get("radius", 5000))))
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(error="Provide valid latitude and longitude."), 400
    category = str(data.get("category", ""))[:40]
    places, warning = google_nearby(lat=lat, lng=lng, radius_m=radius, category=category)
    return jsonify(places=places, warning=warning)


@discovery_bp.post("/api/geocode")
def geocode_api():
    data = request.get_json(silent=True) or {}
    address = str(data.get("address", "")).strip()
    if not address or len(address) > 200:
        return jsonify(error="Enter an address up to 200 characters."), 400
    result, error = geocode_address(address)
    if error:
        return jsonify(error=error), 503 if "unavailable" in error.lower() else 400
    return jsonify(result)


@discovery_bp.post("/api/reverse-geocode")
def reverse_geocode_api():
    data = request.get_json(silent=True) or {}
    try:
        lat, lng = float(data.get("lat")), float(data.get("lng"))
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(error="Provide valid latitude and longitude."), 400
    result, error = reverse_geocode(lat, lng)
    if error:
        return jsonify(error=error), 503 if "unavailable" in error.lower() or "not configured" in error.lower() else 404
    return jsonify(result)


@discovery_bp.get("/api/google-photos")
def google_photo_api():
    photo_name = request.args.get("name", "")
    content, content_type, error = get_google_photo(photo_name)
    if error:
        return jsonify(error=error), 400 if error.startswith("Invalid") else 503
    response = Response(content, mimetype=content_type)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@discovery_bp.post("/api/favorites/<int:place_id>")
@login_required
def add_favorite(place_id: int):
    with closing(get_db()) as connection:
        exists = connection.execute("SELECT 1 FROM places WHERE id = ?", (place_id,)).fetchone()
        if not exists:
            return jsonify(error="Place not found."), 404
        connection.execute("INSERT OR IGNORE INTO favorites (user_id, place_id) VALUES (?, ?)", (current_user.id, place_id))
        connection.commit()
    return jsonify(saved=True)


@discovery_bp.delete("/api/favorites/<int:place_id>")
@login_required
def remove_favorite(place_id: int):
    with closing(get_db()) as connection:
        connection.execute("DELETE FROM favorites WHERE user_id = ? AND place_id = ?", (current_user.id, place_id))
        connection.commit()
    return jsonify(saved=False)
