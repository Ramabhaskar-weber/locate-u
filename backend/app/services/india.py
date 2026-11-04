"""India dataset: import processed files into the database and query them."""
from __future__ import annotations

import json
import math
from pathlib import Path

from sqlalchemy import case, delete, func, select, text
from sqlalchemy.orm import Session

from app.db.models import DatasetImport, District, Place, State
from app.services.geo import haversine_km, normalise_name

OFFICIAL_STATE_COUNT = 28
OFFICIAL_UT_COUNT = 8


class DatasetError(Exception):
    pass


def validate_state_file(payload: dict) -> list[str]:
    """Check internal consistency of one processed state/UT file."""
    problems: list[str] = []
    code = payload["state"]["code"]
    district_ids = {d["id"] for d in payload["districts"]}
    if len(district_ids) != len(payload["districts"]):
        problems.append(f"{code}: duplicate district ids")
    for d in payload["districts"]:
        if not d["id"].startswith(f"{code}-"):
            problems.append(f"{code}: district {d['id']} does not belong to state")
    seen = set()
    for p in payload["places"]:
        if p["district_id"] not in district_ids:
            problems.append(f"{code}: place {p['id']} references unknown district {p['district_id']}")
        if not (-90 <= p["lat"] <= 90 and -180 <= p["lon"] <= 180):
            problems.append(f"{code}: place {p['id']} has invalid coordinates")
        if not p.get("sources"):
            problems.append(f"{code}: place {p['id']} has no source identifier")
        if p["id"] in seen:
            problems.append(f"{code}: duplicate place id {p['id']}")
        seen.add(p["id"])
    return problems


def import_india(db: Session, data_dir: Path, *, only: list[str] | None = None) -> dict:
    states_file = data_dir / "states.json"
    if not states_file.exists():
        raise DatasetError(f"{states_file} not found — run data/scripts/build_india.py first")
    states = json.loads(states_file.read_text())
    manifest = json.loads((data_dir / "manifest.json").read_text()) if (data_dir / "manifest.json").exists() else {}
    validation = json.loads((data_dir / "validation.json").read_text()) if (data_dir / "validation.json").exists() else {}

    payloads = []
    problems: list[str] = []
    for s in states:
        if only and s["code"] not in only:
            continue
        p = json.loads((data_dir / "states" / f"{s['code']}.json").read_text())
        problems += validate_state_file(p)
        payloads.append(p)
    if problems:
        raise DatasetError("; ".join(problems[:20]))

    codes = [p["state"]["code"] for p in payloads]
    db.execute(delete(Place).where(Place.state_code.in_(codes)))
    db.execute(delete(District).where(District.state_code.in_(codes)))
    db.execute(delete(State).where(State.code.in_(codes)))
    db.flush()
    n_d = n_p = 0
    for p in payloads:
        s = p["state"]
        db.add(State(code=s["code"], name=s["name"], type=s["type"], capital=s.get("capital"), lat=s["lat"],
                     lon=s["lon"], bbox=s["bbox"], district_count=s["district_count"],
                     place_count=s["place_count"], source_ids=s.get("source_ids")))
        db.flush()
        db.add_all([District(id=d["id"], state_code=s["code"], name=d["name"], name_2011=d.get("name_2011"),
                             census_2011_code=d.get("census_2011_code"), lat=d["lat"], lon=d["lon"],
                             bbox=d["bbox"], place_count=d["place_count"]) for d in p["districts"]])
        db.flush()
        db.add_all([Place(id=x["id"], state_code=s["code"], district_id=x["district_id"], name=x["name"],
                          name_norm=normalise_name(x["name"]), lat=x["lat"], lon=x["lon"],
                          population=x.get("population"), is_capital=bool(x.get("is_capital")),
                          assignment=x.get("assignment", "contains"), sources=x["sources"])
                    for x in p["places"]])
        n_d += len(p["districts"])
        n_p += len(p["places"])
    counts = {"states": len(payloads), "districts": n_d, "places": n_p}
    db.add(DatasetImport(dataset="india", version=manifest.get("version", "unknown"),
                         generated_at=manifest.get("generated_at"), counts=counts, manifest=manifest,
                         validation={k: v for k, v in validation.items() if k != "samples"}))
    db.commit()
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        _sync_postgis(db)
    return counts


def _sync_postgis(db: Session) -> None:
    has_geom = db.execute(text(
        "SELECT 1 FROM information_schema.columns WHERE table_name='places' AND column_name='geom'")).first()
    if has_geom:
        db.execute(text("UPDATE places SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography WHERE geom IS NULL"))
        db.commit()


def list_states(db: Session) -> list[State]:
    return list(db.execute(select(State).order_by(State.type, State.name)).scalars())


def get_state(db: Session, code: str) -> State | None:
    return db.get(State, code.upper())


def list_districts(db: Session, code: str) -> list[District]:
    return list(db.execute(select(District).where(District.state_code == code.upper()).order_by(District.name)).scalars())


def list_places(db: Session, *, state: str | None = None, district: str | None = None, q: str | None = None,
                min_population: int | None = None, sort: str = "population", limit: int = 100,
                offset: int = 0) -> tuple[list[Place], int]:
    stmt = select(Place)
    if state:
        stmt = stmt.where(Place.state_code == state.upper())
    if district:
        stmt = stmt.where(Place.district_id == district)
    if min_population:
        stmt = stmt.where(Place.population >= min_population)
    if q:
        stmt = stmt.where(Place.name_norm.like(f"%{normalise_name(q)}%"))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    if sort == "name":
        stmt = stmt.order_by(Place.name)
    else:
        stmt = stmt.order_by(func.coalesce(Place.population, 0).desc(), Place.name)
    return list(db.execute(stmt.limit(limit).offset(offset)).scalars()), total


def search(db: Session, q: str, *, state: str | None = None, limit: int = 12) -> dict:
    nq = normalise_name(q)
    if not nq:
        return {"states": [], "districts": [], "places": []}
    st_stmt = select(State).where(func.lower(State.name).like(f"%{q.lower().strip()}%")).limit(5)
    d_stmt = select(District).where(func.lower(District.name).like(f"%{q.lower().strip()}%"))
    rank = case((Place.name_norm == nq, 0), (Place.name_norm.like(f"{nq}%"), 1), else_=2)
    p_stmt = select(Place).where(Place.name_norm.like(f"%{nq}%"))
    if state:
        d_stmt = d_stmt.where(District.state_code == state.upper())
        p_stmt = p_stmt.where(Place.state_code == state.upper())
    p_stmt = p_stmt.order_by(rank, func.coalesce(Place.population, 0).desc(), Place.name).limit(limit)
    return {
        "states": list(db.execute(st_stmt).scalars()) if not state else [],
        "districts": list(db.execute(d_stmt.order_by(District.name).limit(6)).scalars()),
        "places": list(db.execute(p_stmt).scalars()),
    }


def nearest(db: Session, lat: float, lon: float, limit: int = 5, max_km: float = 75.0) -> list[tuple[Place, float]]:
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        has_geom = db.execute(text(
            "SELECT 1 FROM information_schema.columns WHERE table_name='places' AND column_name='geom'")).first()
        if has_geom:
            rows = db.execute(text(
                "SELECT id, ST_Distance(geom, ST_SetSRID(ST_MakePoint(:lon,:lat),4326)::geography)/1000 AS km "
                "FROM places WHERE geom IS NOT NULL AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(:lon,:lat),4326)::geography, :m) "
                "ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lon,:lat),4326)::geography LIMIT :lim"),
                {"lat": lat, "lon": lon, "m": max_km * 1000, "lim": limit}).all()
            places = {p.id: p for p in db.execute(select(Place).where(Place.id.in_([r[0] for r in rows]))).scalars()}
            return [(places[r[0]], float(r[1])) for r in rows if r[0] in places]
    # Portable fallback: bounding-box prefilter + haversine.
    dlat = max_km / 111.0
    dlon = max_km / (111.0 * max(math.cos(math.radians(lat)), 0.2))
    cands = db.execute(select(Place).where(Place.lat.between(lat - dlat, lat + dlat),
                                           Place.lon.between(lon - dlon, lon + dlon))).scalars().all()
    scored = sorted(((p, haversine_km(lat, lon, p.lat, p.lon)) for p in cands), key=lambda x: x[1])
    return [x for x in scored if x[1] <= max_km][:limit]


def coverage(db: Session) -> dict:
    states = list_states(db)
    last = db.execute(select(DatasetImport).where(DatasetImport.dataset == "india")
                      .order_by(DatasetImport.id.desc()).limit(1)).scalar_one_or_none()
    n_states = sum(1 for s in states if s.type == "state")
    n_uts = sum(1 for s in states if s.type == "union_territory")
    return {
        "states": n_states, "union_territories": n_uts,
        "expected": {"states": OFFICIAL_STATE_COUNT, "union_territories": OFFICIAL_UT_COUNT},
        "complete_state_list": n_states == OFFICIAL_STATE_COUNT and n_uts == OFFICIAL_UT_COUNT,
        "districts": db.execute(select(func.count(District.id))).scalar_one(),
        "places": db.execute(select(func.count(Place.id))).scalar_one(),
        "places_by_source": {
            "geonames": db.execute(select(func.count(Place.id)).where(Place.id.like("gn-%"))).scalar_one(),
            "csc_only": db.execute(select(func.count(Place.id)).where(Place.id.like("csc-%"))).scalar_one(),
        },
        "per_state": [{"code": s.code, "name": s.name, "type": s.type, "districts": s.district_count,
                       "places": s.place_count} for s in states],
        "last_import": None if not last else {
            "version": last.version, "generated_at": last.generated_at,
            "imported_at": last.imported_at.isoformat() if last.imported_at else None,
            "counts": last.counts, "validation": last.validation,
        },
        "manifest": last.manifest if last else None,
    }

