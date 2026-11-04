from __future__ import annotations

import re
import sqlite3
import json
from contextlib import closing

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db


auth_bp = Blueprint("auth", __name__)


def valid_email(value: str) -> bool:
    return len(value) <= 254 and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value) is not None


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("discovery.index"))
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        allowed_categories = {"temple", "nature", "beach", "hill_station", "historical", "caves", "hotel", "restaurant", "transport"}
        categories = sorted(set(request.form.getlist("categories")) & allowed_categories)
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        errors = []
        if not re.fullmatch(r"[A-Za-z0-9_]{3,30}", username):
            errors.append("Username must be 3-30 letters, numbers or underscores.")
        if not valid_email(email):
            errors.append("Enter a valid email address.")
        if len(password) < 10 or len(password) > 128:
            errors.append("Password must be between 10 and 128 characters.")
        if errors:
            for error in errors:
                flash(error, "error")
            return render_template("register.html"), 400
        try:
            with closing(get_db()) as connection:
                cursor = connection.execute(
                    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                    (username, email, generate_password_hash(password)),
                )
                connection.commit()
                user_id = cursor.lastrowid
                connection.execute("INSERT INTO user_preferences (user_id) VALUES (?)", (user_id,))
                connection.commit()
        except sqlite3.IntegrityError:
            flash("That username or email is already in use.", "error")
            return render_template("register.html"), 409
        from app import User
        user = User(user_id, username, email)
        login_user(user)
        return redirect(url_for("discovery.index"))
    return render_template("register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("discovery.index"))
    if request.method == "POST":
        identity = request.form.get("identity", "").strip()
        with closing(get_db()) as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ? OR username = ?", (identity, identity)).fetchone()
        if row and check_password_hash(row["password_hash"], request.form.get("password", "")):
            from app import User
            login_user(User(row["id"], row["username"], row["email"], bool(row["is_admin"])), remember=False)
            next_url = request.args.get("next", "")
            return redirect(next_url if next_url.startswith("/") and not next_url.startswith("//") and "\\" not in next_url else url_for("discovery.index"))
        flash("Email/username or password was not recognized.", "error")
        return render_template("login.html"), 401
    return render_template("login.html")


@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been signed out.", "success")
    return redirect(url_for("discovery.index"))


@auth_bp.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        if not re.fullmatch(r"[A-Za-z0-9_]{3,30}", username):
            flash("Username must be 3-30 letters, numbers or underscores.", "error")
        else:
            try:
                with closing(get_db()) as connection:
                    connection.execute("UPDATE users SET username = ? WHERE id = ?", (username, current_user.id))
                    connection.execute(
                        "INSERT INTO user_preferences (user_id, categories) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET categories = excluded.categories, updated_at = CURRENT_TIMESTAMP",
                        (current_user.id, json.dumps(categories)),
                    )
                    connection.commit()
                current_user.username = username
                flash("Profile updated.", "success")
            except sqlite3.IntegrityError:
                flash("That username is already in use.", "error")
        return redirect(url_for("auth.profile"))
    with closing(get_db()) as connection:
        favorites = connection.execute(
            "SELECT places.* FROM favorites JOIN places ON places.id = favorites.place_id WHERE favorites.user_id = ? ORDER BY favorites.created_at DESC",
            (current_user.id,),
        ).fetchall()
        itineraries = connection.execute("SELECT * FROM itineraries WHERE user_id = ? ORDER BY updated_at DESC", (current_user.id,)).fetchall()
        preference_row = connection.execute("SELECT categories FROM user_preferences WHERE user_id = ?", (current_user.id,)).fetchone()
        history = connection.execute("SELECT query, category, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", (current_user.id,)).fetchall()
    try:
        categories = json.loads(preference_row["categories"]) if preference_row else []
    except (TypeError, json.JSONDecodeError):
        categories = []
    return render_template("profile.html", favorites=favorites, itineraries=itineraries, preferred_categories=categories, search_history=history)
