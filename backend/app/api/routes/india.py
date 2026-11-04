"""India explorer: states/UTs → districts → cities/towns (local dataset)."""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import District, Place, State
from app.db.session import get_db
from app.schemas import (
    DistrictOut,
    IndiaSearch,
    NearestPlace,
    PlaceDetail,
    PlaceOut,
    PlacePage,
    StateDetail,
    StateOut,
)
from app.services import india

router = APIRouter(prefix="/india", tags=["india"])
CODE = Annotated[str, Query(pattern=r"^[A-Za-z]{2}$")]
CACHE_HDR = {"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"}


def _state_or_404(db: Session, code: str) -> State:
    s = india.get_state(db, code)
    if not s:
        raise HTTPException(404, f"Unknown state/UT code '{code}'")
    return s


@router.get("/states", response_model=list[StateOut])
def states(response: Response, type: Literal["state", "union_territory"] | None = None, db: Session = Depends(get_db)):
    response.headers.update(CACHE_HDR)
    rows = india.list_states(db)
    return [r for r in rows if not type or r.type == type]


@router.get("/coverage")
def coverage(db: Session = Depends(get_db)):
    return india.coverage(db)


@router.get("/search", response_model=IndiaSearch)
def search(q: Annotated[str, Query(min_length=1, max_length=100)], state: CODE | None = None,
           limit: Annotated[int, Query(ge=1, le=50)] = 12, db: Session = Depends(get_db)):
    res = india.search(db, q, state=state, limit=limit)
    return IndiaSearch(query=q, **res)


@router.get("/nearest", response_model=list[NearestPlace])
def nearest(lat: Annotated[float, Query(ge=-90, le=90)], lon: Annotated[float, Query(ge=-180, le=180)],
            limit: Annotated[int, Query(ge=1, le=25)] = 5, max_km: Annotated[float, Query(gt=0, le=500)] = 75,
            db: Session = Depends(get_db)):
    out = []
    for p, d in india.nearest(db, lat, lon, limit=limit, max_km=max_km):
        dist = db.get(District, p.district_id)
        st = db.get(State, p.state_code)
        out.append(NearestPlace(place=PlaceOut.model_validate(p), district=dist.name if dist else None,
                                state=st.name if st else None, distance_km=round(d, 2)))
    return out


@router.get("/boundaries/states")
def state_boundaries():
    return _boundary_file("india-states.geojson")


@router.get("/boundaries/{code}")
def district_boundaries(code: str):
    if len(code) != 2 or not code.isalpha():
        raise HTTPException(422, "Invalid state code")
    return _boundary_file(f"{code.upper()}.geojson")


def _boundary_file(name: str):
    path = get_settings().india_data_path / "boundaries" / name
    if not path.exists():
        raise HTTPException(404, "Boundary file not available")
    return FileResponse(path, media_type="application/geo+json", headers=CACHE_HDR)


@router.get("/places/{place_id}", response_model=PlaceDetail)
def place_detail(place_id: str, db: Session = Depends(get_db)):
    p = db.get(Place, place_id)
    if not p:
        raise HTTPException(404, "Place not found in the India dataset")
    d = db.get(District, p.district_id)
    s = db.get(State, p.state_code)
    near = []
    for q, dist in india.nearest(db, p.lat, p.lon, limit=7, max_km=50):
        if q.id == p.id:
            continue
        near.append(NearestPlace(place=PlaceOut.model_validate(q), district=None, state=None,
                                 distance_km=round(dist, 2)))
    return PlaceDetail(place=PlaceOut.model_validate(p), district=DistrictOut.model_validate(d),
                       state=StateOut.model_validate(s), nearby=near[:6])


@router.get("/{code}", response_model=StateDetail)
def state_detail(code: str, response: Response, db: Session = Depends(get_db)):
    s = _state_or_404(db, code)
    response.headers.update(CACHE_HDR)
    return StateDetail(state=StateOut.model_validate(s), districts=[DistrictOut.model_validate(d) for d in india.list_districts(db, s.code)])


@router.get("/{code}/districts", response_model=list[DistrictOut])
def districts(code: str, response: Response, db: Session = Depends(get_db)):
    s = _state_or_404(db, code)
    response.headers.update(CACHE_HDR)
    return india.list_districts(db, s.code)


@router.get("/{code}/places", response_model=PlacePage)
def places(code: str, response: Response,
           district: Annotated[str | None, Query(max_length=40)] = None,
           q: Annotated[str | None, Query(max_length=100)] = None,
           min_population: Annotated[int | None, Query(ge=0)] = None,
           sort: Literal["population", "name"] = "population",
           limit: Annotated[int, Query(ge=1, le=2000)] = 200,
           offset: Annotated[int, Query(ge=0)] = 0,
           db: Session = Depends(get_db)):
    s = _state_or_404(db, code)
    if district:
        d = db.get(District, district)
        if not d or d.state_code != s.code:
            # Validates the state → district relationship instead of returning silently-empty data.
            raise HTTPException(422, f"District '{district}' does not belong to {s.name}")
    items, total = india.list_places(db, state=s.code, district=district, q=q, min_population=min_population,
                                     sort=sort, limit=limit, offset=offset)
    response.headers.update(CACHE_HDR)
    return PlacePage(total=total, limit=limit, offset=offset, items=items)


