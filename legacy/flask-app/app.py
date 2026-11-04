from __future__ import annotations

import logging
import os
import secrets
import sqlite3
from contextlib import closing
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, url_for
from flask_login import LoginManager, UserMixin
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect

from admin import admin_bp
from auth import auth_bp
from database import get_db, init_db
from discovery import discovery_bp
from planning import planning_bp


class User(UserMixin):
    def __init__(self, user_id: int, username: str, email: str, is_admin: bool = False):
        self.id = str(user_id)
        self.username = username
        self.email = email
        self.is_admin = is_admin


csrf = CSRFProtect()
login_manager = LoginManager()


def create_app(test_config: dict | None = None) -> Flask:
    load_dotenv(dotenv_path=Path(__file__).resolve().with_name(".env"), override=False)
    app = Flask(__name__, instance_relative_config=True)
    secret = os.getenv("FLASK_SECRET_KEY")
    if not secret:
        secret = secrets.token_hex(32)
        logging.getLogger(__name__).warning("FLASK_SECRET_KEY is unset; sessions will reset when the process restarts.")
    app.config.from_mapping(
        SECRET_KEY=secret,
        DATABASE_PATH=os.getenv("DATABASE_PATH", str(Path(app.instance_path) / "locateu.sqlite3")),
        GOOGLE_MAPS_BROWSER_KEY=os.getenv("GOOGLE_MAPS_BROWSER_KEY", "").strip(),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "0") == "1",
        REMEMBER_COOKIE_HTTPONLY=True,
        WTF_CSRF_TIME_LIMIT=3600,
        MAX_CONTENT_LENGTH=2 * 1024 * 1024,
    )
    if test_config:
        app.config.update(test_config)
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    os.environ["DATABASE_PATH"] = str(app.config["DATABASE_PATH"])
    init_db(app.config["DATABASE_PATH"])

    csrf.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Sign in to continue."
    Limiter(get_remote_address, app=app, default_limits=["300 per day", "80 per hour"], storage_uri="memory://")

    app.register_blueprint(auth_bp)
    app.register_blueprint(discovery_bp)
    app.register_blueprint(planning_bp)
    app.register_blueprint(admin_bp)

    @login_manager.user_loader
    def load_user(user_id: str):
        try:
            with closing(get_db(app.config["DATABASE_PATH"])) as connection:
                row = connection.execute("SELECT id, username, email, is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
        except (sqlite3.Error, ValueError):
            return None
        if not row:
            return None
        return User(row["id"], row["username"], row["email"], bool(row["is_admin"]))

    @login_manager.unauthorized_handler
    def unauthorized():
        if request.path.startswith("/api/"):
            return jsonify(error="Sign in to continue."), 401
        return redirect(url_for("auth.login", next=request.full_path))

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(self)")
        return response

    @app.errorhandler(429)
    def rate_limit_error(_error):
        return jsonify(error="Too many requests. Please try again shortly."), 429

    @app.errorhandler(500)
    def internal_error(_error):
        app.logger.exception("Unhandled application error")
        if request.path.startswith("/api/"):
            return jsonify(error="An unexpected server error occurred."), 500
        return "An unexpected error occurred. Please try again.", 500

    return app


app = create_app()


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=debug)
