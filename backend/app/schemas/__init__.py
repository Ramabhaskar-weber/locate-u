"""Pydantic request/response models (the typed API contract)."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Lat = Field(ge=-90, le=90)
Lon = Field(ge=-180, le=180)

PHONE_RE = re.compile(r"^\+?[1-9]\d{6,14}$")
INDIA_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


def normalize_phone(country_code: str | None, phone: str) -> str:
    raw = re.sub(r"[\s\-\(\)]", "", phone.strip())
    cc = (country_code or "+91").strip()
    if not cc.startswith("+"):
        cc = "+" + cc
    if raw.startswith("+91"):
        digits = raw[3:].lstrip("0")
        if not INDIA_MOBILE_RE.match(digits):
            raise ValueError("Indian mobile numbers (+91) must be 10 digits starting with 6-9")
        return f"+91{digits}"
    if raw.startswith("+"):
        return raw
    raw = raw.lstrip("0")
    if cc == "+91" and not INDIA_MOBILE_RE.match(raw):
        raise ValueError("Indian mobile numbers (+91) must be 10 digits starting with 6-9")
    return f"{cc}{raw}"


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


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


class RegisterIn(BaseModel):
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, max_length=24)
    country_code: str = Field(default="+91", max_length=8)
    otp_code: str | None = Field(default=None, min_length=4, max_length=8)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)
    country: str | None = Field(default="India", max_length=80)
    state: str | None = Field(default=None, max_length=80)
    home_city: str | None = Field(default=None, max_length=120)
    food_preference: str | None = Field(default="Vegetarian", max_length=40)

    @field_validator("password")
    @classmethod
    def _strong(cls, v: str) -> str:
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must mix letters and numbers/symbols")
        return v

    @model_validator(mode="after")
    def _check_contact(self) -> "RegisterIn":
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone_number is required")
        if self.phone_number:
            norm = normalize_phone(self.country_code, self.phone_number)
            if not PHONE_RE.match(norm):
                raise ValueError("Enter a valid phone number")
            self.phone_number = norm
        return self


class LoginIn(BaseModel):
    email: str | None = None
    phone_number: str | None = None
    country_code: str = Field(default="+91", max_length=8)
    identifier: str | None = None
    password: str | None = Field(default=None, min_length=1, max_length=128)
    otp_code: str | None = Field(default=None, min_length=4, max_length=8)

    @model_validator(mode="after")
    def _check_login(self) -> "LoginIn":
        if not (self.email or self.phone_number or self.identifier):
            raise ValueError("Email or phone number is required")
        if not (self.password or self.otp_code):
            raise ValueError("Password or OTP code is required")
        return self


class OtpSendIn(BaseModel):
    phone_number: str | None = Field(default=None, max_length=24)
    country_code: str = Field(default="+91", max_length=8)
    email: EmailStr | None = None
    purpose: Literal["register", "login", "reset_password", "verify_phone"] = "login"

    @model_validator(mode="after")
    def _validate_target(self) -> "OtpSendIn":
        if not self.phone_number and not self.email:
            raise ValueError("Phone number or email is required to send OTP")
        if self.phone_number:
            norm = normalize_phone(self.country_code, self.phone_number)
            if not PHONE_RE.match(norm):
                raise ValueError("Enter a valid phone number")
            self.phone_number = norm
        return self


class OtpSendOut(BaseModel):
    target: str
    purpose: str
    expires_in_seconds: int
    cooldown_seconds: int
    provider: str
    message: str
    dev_otp_preview: str | None = None


class OtpVerifyIn(BaseModel):
    phone_number: str | None = Field(default=None, max_length=24)
    country_code: str = Field(default="+91", max_length=8)
    email: EmailStr | None = None
    otp_code: str = Field(min_length=4, max_length=8)
    purpose: Literal["register", "login", "reset_password", "verify_phone"] = "login"
    display_name: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def _norm(self) -> "OtpVerifyIn":
        if not self.phone_number and not self.email:
            raise ValueError("Phone number or email is required")
        if self.phone_number:
            self.phone_number = normalize_phone(self.country_code, self.phone_number)
        return self


class PasswordResetIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=254)
    country_code: str = Field(default="+91", max_length=8)
    otp_code: str = Field(min_length=4, max_length=8)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _strong(cls, v: str) -> str:
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must mix letters and numbers/symbols")
        return v


class ProfileUpdateIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, max_length=24)
    country_code: str | None = Field(default="+91", max_length=8)
    avatar_url: str | None = Field(default=None, max_length=350000)
    date_of_birth: str | None = Field(default=None, max_length=20)
    gender: str | None = Field(default=None, max_length=32)
    country: str | None = Field(default=None, max_length=80)
    state: str | None = Field(default=None, max_length=80)
    home_city: str | None = Field(default=None, max_length=120)
    food_preference: str | None = Field(default="Vegetarian", max_length=40)

    @model_validator(mode="after")
    def _clean_phone(self) -> "ProfileUpdateIn":
        if self.phone_number is not None and self.phone_number.strip():
            norm = normalize_phone(self.country_code, self.phone_number)
            if not PHONE_RE.match(norm):
                raise ValueError("Enter a valid phone number")
            self.phone_number = norm
        return self


class UserOut(ORM):
    id: str
    email: str | None = None
    phone_number: str | None = None
    country_code: str | None = "+91"
    phone_verified: bool = False
    display_name: str
    avatar_url: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    country: str | None = "India"
    state: str | None = None
    home_city: str | None = None
    food_preference: str | None = "Vegetarian"
    created_at: datetime
    updated_at: datetime | None = None


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


class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    source_lang: str = Field(default="auto", max_length=12)
    target_lang: str = Field(default="te", max_length=12)


class TranslateOut(BaseModel):
    original_text: str
    translated_text: str
    transliteration: str | None = None
    detected_source_lang: str
    target_lang: str
    provider: str
    cached: bool = False


class TransportDeepLinkIn(BaseModel):
    pickup_lat: float = Lat
    pickup_lon: float = Lon
    pickup_name: str = Field(default="Current Location", max_length=200)
    drop_lat: float = Lat
    drop_lon: float = Lon
    drop_name: str = Field(default="Destination", max_length=200)


ReverseResponse.model_rebuild()
