from __future__ import annotations

import sqlite3
from contextlib import closing
from functools import wraps

from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from database import get_db


admin_bp = Blueprint("admin", __name__)


def admin_required(view):
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if not current_user.is_admin:
            return "Forbidden", 403
        return view(*args, **kwargs)
    return wrapped


@admin_bp.get("/admin")
@admin_required
def dashboard():
    with closing(get_db()) as connection:
        stats = {
            "users": connection.execute("SELECT COUNT(*) FROM users").fetchone()[0],
            "places": connection.execute("SELECT COUNT(*) FROM places").fetchone()[0],
            "pending": connection.execute("SELECT COUNT(*) FROM places WHERE verified = 0").fetchone()[0],
            "itineraries": connection.execute("SELECT COUNT(*) FROM itineraries").fetchone()[0],
        }
        places = connection.execute("SELECT * FROM places ORDER BY verified ASC, name").fetchall()
        users = connection.execute("SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 100").fetchall()
    return render_template("admin.html", stats=stats, places=places, users=users)


@admin_bp.post("/api/admin/places")
@admin_required
def create_place():
    data = request.get_json(silent=True) or request.form
    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "")).strip()
    address = str(data.get("address", "")).strip()
    description = str(data.get("description", "")).strip()
    try:
        lat, lng = float(data.get("latitude")), float(data.get("longitude"))
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(error="Valid coordinates are required."), 400
    if not name or len(name) > 120 or len(category) > 40 or len(address) > 240:
        return jsonify(error="Name, category or address is missing or too long."), 400
    try:
        with closing(get_db()) as connection:
            cursor = connection.execute("INSERT INTO places (name, category, description, address, latitude, longitude, verified, source) VALUES (?, ?, ?, ?, ?, ?, 1, 'admin curated')", (name, category, description[:1000], address, lat, lng))
            connection.commit()
    except sqlite3.IntegrityError:
        return jsonify(error="A destination with this place identifier already exists."), 409
    return jsonify(id=cursor.lastrowid), 201


@admin_bp.patch("/api/admin/places/<int:place_id>")
@admin_required
def update_place(place_id: int):
    data = request.get_json(silent=True) or {}
    allowed = {"name", "category", "description", "address", "latitude", "longitude", "rating", "review_count", "website", "phone", "verified"}
    updates = {key: data[key] for key in allowed if key in data}
    if not updates:
        return jsonify(error="No supported fields were provided."), 400
    if "latitude" in updates or "longitude" in updates:
        try:
            lat, lng = float(updates.get("latitude")), float(updates.get("longitude"))
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                raise ValueError
            updates["latitude"], updates["longitude"] = lat, lng
        except (TypeError, ValueError):
            return jsonify(error="Both valid coordinates are required when changing location."), 400
    if "rating" in updates and updates["rating"] not in (None, ""):
        try:
            rating = float(updates["rating"])
            if not 0 <= rating <= 5:
                raise ValueError
            updates["rating"] = rating
        except (TypeError, ValueError):
            return jsonify(error="Rating must be between 0 and 5."), 400
    assignments = ", ".join(f"{field} = ?" for field in updates)
    values = list(updates.values()) + [place_id]
    with closing(get_db()) as connection:
        cursor = connection.execute(f"UPDATE places SET {assignments} WHERE id = ?", values)
        connection.commit()
    if not cursor.rowcount:
        return jsonify(error="Place not found."), 404
    return jsonify(updated=True)


@admin_bp.delete("/api/admin/places/<int:place_id>")
@admin_required
def delete_place(place_id: int):
    with closing(get_db()) as connection:
        cursor = connection.execute("DELETE FROM places WHERE id = ?", (place_id,))
        connection.commit()
    if not cursor.rowcount:
        return jsonify(error="Place not found."), 404
    return jsonify(deleted=True)


@admin_bp.patch("/api/admin/users/<int:user_id>")
@admin_required
def update_user(user_id: int):
    data = request.get_json(silent=True) or {}
    is_admin = data.get("is_admin")
    if not isinstance(is_admin, bool):
        return jsonify(error="is_admin must be true or false."), 400
    if user_id == current_user.id and not is_admin:
        return jsonify(error="You cannot remove your own admin access."), 400
    with closing(get_db()) as connection:
        cursor = connection.execute("UPDATE users SET is_admin = ? WHERE id = ?", (int(is_admin), user_id))
        connection.commit()
    if not cursor.rowcount:
        return jsonify(error="User not found."), 404
    return jsonify(updated=True)
