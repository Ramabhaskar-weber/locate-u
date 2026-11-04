from __future__ import annotations

from contextlib import closing

from flask import Blueprint, jsonify, render_template, request
from flask_login import current_user, login_required

from database import get_db


planning_bp = Blueprint("planning", __name__)


def _owned_itinerary(connection, itinerary_id: int):
    return connection.execute("SELECT * FROM itineraries WHERE id = ? AND user_id = ?", (itinerary_id, current_user.id)).fetchone()


@planning_bp.get("/itinerary")
@login_required
def itinerary_page():
    with closing(get_db()) as connection:
        itineraries = connection.execute("SELECT * FROM itineraries WHERE user_id = ? ORDER BY updated_at DESC", (current_user.id,)).fetchall()
        places = connection.execute("SELECT id, name, category FROM places ORDER BY name").fetchall()
    return render_template("itinerary.html", itineraries=itineraries, places=places)


@planning_bp.get("/api/itineraries")
@login_required
def list_itineraries():
    with closing(get_db()) as connection:
        items = connection.execute("SELECT * FROM itineraries WHERE user_id = ? ORDER BY updated_at DESC", (current_user.id,)).fetchall()
        result = []
        for item in items:
            row = dict(item)
            row["items"] = [dict(place) for place in connection.execute(
                "SELECT itinerary_items.*, places.name AS place_name, places.latitude, places.longitude FROM itinerary_items LEFT JOIN places ON places.id = itinerary_items.place_id WHERE itinerary_id = ? ORDER BY day_number, position, id",
                (item["id"],),
            ).fetchall()]
            result.append(row)
    return jsonify(itineraries=result)


@planning_bp.post("/api/itineraries")
@login_required
def create_itinerary():
    data = request.get_json(silent=True) or {}
    title, destination = str(data.get("title", "")).strip(), str(data.get("destination", "")).strip()
    if not title or len(title) > 100 or len(destination) > 160:
        return jsonify(error="A title up to 100 characters is required; destination must be under 160 characters."), 400
    with closing(get_db()) as connection:
        cursor = connection.execute("INSERT INTO itineraries (user_id, title, destination, start_date) VALUES (?, ?, ?, ?)", (current_user.id, title, destination, data.get("start_date") or None))
        connection.commit()
    return jsonify(id=cursor.lastrowid, title=title), 201


@planning_bp.patch("/api/itineraries/<int:itinerary_id>")
@login_required
def update_itinerary(itinerary_id: int):
    data = request.get_json(silent=True) or {}
    with closing(get_db()) as connection:
        if not _owned_itinerary(connection, itinerary_id):
            return jsonify(error="Itinerary not found."), 404
        if "title" in data:
            title = str(data["title"]).strip()
            if not title or len(title) > 100:
                return jsonify(error="Title must be 1-100 characters."), 400
            connection.execute("UPDATE itineraries SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (title, itinerary_id))
        if "destination" in data:
            destination = str(data["destination"]).strip()
            if len(destination) > 160:
                return jsonify(error="Destination must be under 160 characters."), 400
            connection.execute("UPDATE itineraries SET destination = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (destination, itinerary_id))
        connection.commit()
    return jsonify(updated=True)


@planning_bp.delete("/api/itineraries/<int:itinerary_id>")
@login_required
def delete_itinerary(itinerary_id: int):
    with closing(get_db()) as connection:
        cursor = connection.execute("DELETE FROM itineraries WHERE id = ? AND user_id = ?", (itinerary_id, current_user.id))
        connection.commit()
    if not cursor.rowcount:
        return jsonify(error="Itinerary not found."), 404
    return jsonify(deleted=True)


@planning_bp.post("/api/itineraries/<int:itinerary_id>/items")
@login_required
def add_itinerary_item(itinerary_id: int):
    data = request.get_json(silent=True) or {}
    try:
        day = int(data.get("day_number", 1))
        place_id = int(data["place_id"]) if data.get("place_id") else None
        if not 1 <= day <= 365:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(error="Day number must be between 1 and 365."), 400
    notes = str(data.get("notes", ""))[:1000]
    with closing(get_db()) as connection:
        if not _owned_itinerary(connection, itinerary_id):
            return jsonify(error="Itinerary not found."), 404
        place = connection.execute("SELECT * FROM places WHERE id = ?", (place_id,)).fetchone() if place_id else None
        if place_id and not place:
            return jsonify(error="Place not found."), 404
        title = str(data.get("title", "")).strip()[:120] or (place["name"] if place else "")
        if not title:
            return jsonify(error="Choose a place or provide a title."), 400
        position = connection.execute("SELECT COALESCE(MAX(position), -1) + 1 FROM itinerary_items WHERE itinerary_id = ? AND day_number = ?", (itinerary_id, day)).fetchone()[0]
        cursor = connection.execute("INSERT INTO itinerary_items (itinerary_id, place_id, day_number, title, notes, position) VALUES (?, ?, ?, ?, ?, ?)", (itinerary_id, place_id, day, title, notes, position))
        connection.execute("UPDATE itineraries SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (itinerary_id,))
        connection.commit()
    return jsonify(id=cursor.lastrowid, title=title, day_number=day), 201


@planning_bp.delete("/api/itineraries/<int:itinerary_id>/items/<int:item_id>")
@login_required
def remove_itinerary_item(itinerary_id: int, item_id: int):
    with closing(get_db()) as connection:
        if not _owned_itinerary(connection, itinerary_id):
            return jsonify(error="Itinerary not found."), 404
        cursor = connection.execute("DELETE FROM itinerary_items WHERE id = ? AND itinerary_id = ?", (item_id, itinerary_id))
        connection.commit()
    if not cursor.rowcount:
        return jsonify(error="Itinerary item not found."), 404
    return jsonify(deleted=True)
