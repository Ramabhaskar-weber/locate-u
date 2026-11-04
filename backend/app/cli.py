"""Operational commands.

    python -m app.cli migrate        # alembic upgrade head
    python -m app.cli import-india   # load data/processed/india into the database
    python -m app.cli setup          # migrate + import if empty
    python -m app.cli purge-cache    # delete expired provider cache rows
    python -m app.cli coverage       # print dataset coverage
"""
from __future__ import annotations

import argparse
import json
import sys

from sqlalchemy import func, inspect, select

from app.core.config import BACKEND_DIR, get_settings
from app.db.models import State
from app.db.session import SessionLocal, get_engine


def migrate() -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", get_settings().DATABASE_URL.replace("%", "%%"))
    command.upgrade(cfg, "head")


def import_india(only: list[str] | None = None) -> dict:
    from app.services.india import import_india as _imp

    with SessionLocal() as db:
        return _imp(db, get_settings().india_data_path, only=only)


def ensure_ready() -> None:
    migrate()
    engine = get_engine()
    if "states" not in inspect(engine).get_table_names():
        return
    with SessionLocal() as db:
        n = db.execute(select(func.count(State.code))).scalar_one()
    if n == 0 and (get_settings().india_data_path / "states.json").exists():
        print("Importing India dataset…", import_india())


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("migrate")
    imp = sub.add_parser("import-india")
    imp.add_argument("--only", nargs="*", help="State/UT codes to (re)import")
    sub.add_parser("setup")
    sub.add_parser("purge-cache")
    sub.add_parser("coverage")
    a = ap.parse_args(argv)
    if a.cmd == "migrate":
        migrate()
    elif a.cmd == "import-india":
        migrate()
        print(json.dumps(import_india([c.upper() for c in a.only] if a.only else None), indent=1))
    elif a.cmd == "setup":
        ensure_ready()
    elif a.cmd == "purge-cache":
        from app.services.cache import cache_purge_expired

        with SessionLocal() as db:
            print(f"Removed {cache_purge_expired(db)} expired cache rows")
    elif a.cmd == "coverage":
        from app.services.india import coverage

        with SessionLocal() as db:
            c = coverage(db)
            c.pop("manifest", None)
            print(json.dumps(c, indent=1, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
