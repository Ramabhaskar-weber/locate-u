from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

_TMP = Path(tempfile.mkdtemp(prefix="locate_u_test_"))
os.environ.update({
    "APP_ENV": "test",
    # Set TEST_DATABASE_URL (e.g. a throwaway PostgreSQL+PostGIS database) to run the suite against it.
    "DATABASE_URL": os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_TMP / 'test.sqlite3'}",
    "AUTO_SETUP": "false",
    "RATE_LIMIT_PER_MINUTE": "0",
    "SECRET_KEY": "test-secret-key-that-is-long-enough-123",
    "NOMINATIM_BASE_URL": "https://nominatim.test",
    "OPEN_METEO_BASE_URL": "https://meteo.test/v1",
    "WIKIPEDIA_BASE_URL": "https://en.wikipedia.test",
    "OVERPASS_URL": "https://overpass.test/api/interpreter",
    "NOMINATIM_MIN_INTERVAL_SECONDS": "0",
    "CORS_ORIGINS": "http://localhost:5173",
    "FRONTEND_DIST": str(_TMP / "no-frontend"),
})

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db.models import Base  # noqa: E402
from app.db.session import SessionLocal, get_engine  # noqa: E402
from app.providers.base import reset_throttles  # noqa: E402
from app.services.india import import_india  # noqa: E402

TEST_STATES = ["AP", "TG", "DL", "GA", "LA", "JK", "PY", "DH"]


@pytest.fixture(scope="session", autouse=True)
def _db():
    engine = get_engine()
    if engine.dialect.name == "postgresql":
        from app.cli import migrate

        Base.metadata.drop_all(engine)
        with engine.begin() as c:
            c.exec_driver_sql("DROP TABLE IF EXISTS alembic_version")
        migrate()  # real migrations, including the PostGIS column + GiST index
    else:
        Base.metadata.create_all(engine)
    with SessionLocal() as db:
        import_india(db, get_settings().india_data_path, only=TEST_STATES)
    yield
    engine.dispose()


@pytest.fixture()
def client():
    from app.main import create_app

    reset_throttles()
    with TestClient(create_app()) as c:
        yield c


@pytest.fixture()
def db():
    with SessionLocal() as s:
        yield s
