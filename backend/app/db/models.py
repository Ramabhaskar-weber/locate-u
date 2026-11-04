"""SQLAlchemy ORM models.

Coordinates are stored as plain latitude/longitude floats so the schema works
on SQLite (tests) and PostgreSQL. On PostgreSQL the Alembic migration also
adds a PostGIS ``geography(Point, 4326)`` column (``places.geom``) with a GiST
index, which the nearest-place query uses when available.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class State(Base):
    __tablename__ = "states"
    code: Mapped[str] = mapped_column(String(4), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    type: Mapped[str] = mapped_column(String(20))  # state | union_territory
    capital: Mapped[str | None] = mapped_column(String(120))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    bbox: Mapped[list | None] = mapped_column(JSON)
    district_count: Mapped[int] = mapped_column(Integer, default=0)
    place_count: Mapped[int] = mapped_column(Integer, default=0)
    source_ids: Mapped[dict | None] = mapped_column(JSON)

    districts: Mapped[list["District"]] = relationship(back_populates="state", cascade="all, delete-orphan")


class District(Base):
    __tablename__ = "districts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    state_code: Mapped[str] = mapped_column(ForeignKey("states.code", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    name_2011: Mapped[str | None] = mapped_column(String(160))
    census_2011_code: Mapped[int | None] = mapped_column(Integer)
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    bbox: Mapped[list | None] = mapped_column(JSON)
    place_count: Mapped[int] = mapped_column(Integer, default=0)

    state: Mapped[State] = relationship(back_populates="districts")
    __table_args__ = (UniqueConstraint("state_code", "name", name="uq_district_state_name"),)


class Place(Base):
    __tablename__ = "places"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    state_code: Mapped[str] = mapped_column(ForeignKey("states.code", ondelete="CASCADE"), index=True)
    district_id: Mapped[str] = mapped_column(ForeignKey("districts.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    name_norm: Mapped[str] = mapped_column(String(200), index=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    population: Mapped[int | None] = mapped_column(Integer)
    is_capital: Mapped[bool] = mapped_column(Boolean, default=False)
    assignment: Mapped[str] = mapped_column(String(20), default="contains")
    sources: Mapped[dict] = mapped_column(JSON, default=dict)

    __table_args__ = (Index("ix_places_lat_lon", "lat", "lon"),)


class DatasetImport(Base):
    __tablename__ = "dataset_imports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset: Mapped[str] = mapped_column(String(120))
    version: Mapped[str] = mapped_column(String(40))
    generated_at: Mapped[str | None] = mapped_column(String(40))
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    counts: Mapped[dict | None] = mapped_column(JSON)
    manifest: Mapped[dict | None] = mapped_column(JSON)
    validation: Mapped[dict | None] = mapped_column(JSON)


class ProviderCache(Base):
    """Cache for third-party provider responses (Nominatim, Open-Meteo, …)."""

    __tablename__ = "provider_cache"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)  # sha256 of provider+params
    provider: Mapped[str] = mapped_column(String(40), index=True)
    payload: Mapped[dict | list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    hits: Mapped[int] = mapped_column(Integer, default=0)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    saved: Mapped[list["SavedLocation"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class SavedLocation(Base):
    __tablename__ = "saved_locations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    address: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    collection: Mapped[str | None] = mapped_column(String(80))
    color: Mapped[str | None] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(String(40), default="map")  # map | search | india | gps
    source_ref: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="saved")
