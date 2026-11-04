"""Pydantic request/response models (the typed API contract)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Lat = Field(ge=-90, le=90)
Lon = Field(ge=-180, le=180)


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- geocoding --------------------------------------------------------------
class GeoPlace(BaseModel):
    id: str
    name: str
    display_name: str
    lat: float
    lon: float
    category: str | None = None
    type: str | None = None
    importance: float | None = None
    osm_type: str | None = None
    osm_id: int | None = None
    bbox: list[float] | None = None
    address: dict[str, str] = {}
    source: str
    licence: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[GeoPlace]
    cached: bool
    fetched_at: datetime
    provider: str
    attribution: str = "© OpenStreetMap contributors (ODbL) — geocoding by Nominatim"


class ReverseResponse(BaseModel):
    lat: float
    lon: float
    result: GeoPlace | None
    nearest_india_places: list["NearestPlace"] = []
    cached: bool
    fetched_at: datetime
    provider: str
    attribution: str = "© OpenStreetMap contributors (ODbL) — geocoding by Nominatim"


# ---- India ------------------------------------------------------------------
class StateOut(ORM):
    code: str
    name: str
    type: Literal["state", "union_territory"]
    capital: str | None
    lat: float | None
    lon: float | None
    bbox: list[float] | None
    district_count: int
    place_count: int
    source_ids: dict | None = None


class DistrictOut(ORM):
    id: str
    state_code: str
    name: str
    name_2011: str | None
    census_2011_code: int | None
    lat: float | None
    lon: float | None
    bbox: list[float] | None
    place_count: int


class PlaceOut(ORM):
    id: str
    state_code: str
    district_id: str
    name: str
    lat: float
    lon: float
    population: int | None
    is_capital: bool
    assignment: str
    sources: dict


class NearestPlace(BaseModel):
    place: PlaceOut
    district: str | None
    state: str | None
    distance_km: float


class StateDetail(BaseModel):
    state: StateOut
    districts: list[DistrictOut]


class PlacePage(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[PlaceOut]


class IndiaSearch(BaseModel):
    query: str
    states: list[StateOut]
    districts: list[DistrictOut]
    places: list[PlaceOut]


class PlaceDetail(BaseModel):
    place: PlaceOut
    district: DistrictOut
    state: StateOut
    nearby: list[NearestPlace]


# ---- auth & saved -----------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("password")
    @classmethod
    def _strong(cls, v: str) -> str:
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must mix letters and numbers/symbols")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORM):
    id: str
    email: str
    display_name: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class SavedIn(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    name: str = Field(min_length=1, max_length=200)
    lat: float = Lat
    lon: float = Lon
    address: str | None = Field(default=None, max_length=1000)
    note: str | None = Field(default=None, max_length=2000)
    tags: list[str] = Field(default_factory=list, max_length=20)
    collection: str | None = Field(default=None, max_length=80)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    source: Literal["map", "search", "india", "gps", "import"] = "map"
    source_ref: str | None = Field(default=None, max_length=120)

    @field_validator("tags")
    @classmethod
    def _tags(cls, v: list[str]) -> list[str]:
        return [t.strip()[:40] for t in v if t.strip()]


class SavedOut(ORM):
    id: str
    name: str
    lat: float
    lon: float
    address: str | None
    note: str | None
    tags: list[str]
    collection: str | None
    color: str | None
    source: str
    source_ref: str | None
    created_at: datetime
    updated_at: datetime


class SyncIn(BaseModel):
    items: list[SavedIn] = Field(max_length=1000)


ReverseResponse.model_rebuild()
