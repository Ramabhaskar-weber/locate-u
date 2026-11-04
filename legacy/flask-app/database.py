from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_place_id TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    review_count INTEGER CHECK (review_count IS NULL OR review_count >= 0),
    photo_url TEXT,
    phone TEXT,
    website TEXT,
    opening_hours TEXT,
    source TEXT NOT NULL DEFAULT 'curated starter dataset',
    verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, place_id)
);
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    category TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS itineraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    destination TEXT NOT NULL DEFAULT '',
    start_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS itinerary_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itinerary_id INTEGER NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
    day_number INTEGER NOT NULL DEFAULT 1 CHECK (day_number > 0),
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    categories TEXT NOT NULL DEFAULT '[]',
    max_distance_km REAL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_rating ON places(rating DESC);
CREATE INDEX IF NOT EXISTS idx_history_user_created ON search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_parent ON itinerary_items(itinerary_id, day_number, position);
"""

STARTER_PLACES: tuple[dict[str, Any], ...] = (
    {"name": "Araku Valley", "category": "hill_station", "description": "Hill region known for its valley scenery and coffee-growing communities.", "address": "Alluri Sitharama Raju district, Andhra Pradesh, India", "latitude": 18.3273, "longitude": 83.0051},
    {"name": "Borra Caves", "category": "caves", "description": "Limestone cave system in the Eastern Ghats; check local access conditions before travel.", "address": "Ananthagiri mandal, Andhra Pradesh, India", "latitude": 18.2809, "longitude": 83.0416},
    {"name": "Gandikota", "category": "historical", "description": "Historic fort area overlooking the Penna River gorge.", "address": "Kadapa district, Andhra Pradesh, India", "latitude": 14.8136, "longitude": 78.2896},
    {"name": "Lepakshi", "category": "historical", "description": "Historic temple town noted for Vijayanagara-era architecture.", "address": "Sri Sathya Sai district, Andhra Pradesh, India", "latitude": 13.8016, "longitude": 77.6050},
    {"name": "Tirumala", "category": "temple", "description": "Hill town and pilgrimage destination in Tirupati district.", "address": "Tirupati district, Andhra Pradesh, India", "latitude": 13.6833, "longitude": 79.3470},
    {"name": "Srikalahasti Temple", "category": "temple", "description": "Historic Shiva temple in Srikalahasti town.", "address": "Tirupati district, Andhra Pradesh, India", "latitude": 13.7498, "longitude": 79.6984},
    {"name": "Konaseema", "category": "nature", "description": "River delta region; this map point is an approximate regional reference, not a venue entrance.", "address": "Dr. B. R. Ambedkar Konaseema district, Andhra Pradesh, India", "latitude": 16.7000, "longitude": 82.0000},
    {"name": "Papikondalu", "category": "nature", "description": "Scenic hill and river region; access and boat services require local confirmation.", "address": "Godavari River region, Andhra Pradesh, India", "latitude": 17.6000, "longitude": 81.4000},
    {"name": "Kakinada Beach", "category": "beach", "description": "Coastal area in Kakinada; check local conditions and access information.", "address": "Kakinada, Andhra Pradesh, India", "latitude": 16.9500, "longitude": 82.2500},
    {"name": "Maredumilli", "category": "nature", "description": "Forest and eco-tourism area in the Eastern Ghats; permits or local rules may apply.", "address": "Alluri Sitharama Raju district, Andhra Pradesh, India", "latitude": 17.6050, "longitude": 81.7120},
    {"name": "Green Park Residency", "category": "hotel", "description": "Family-friendly boutique property with parking, breakfast, and easy access to the beach road.", "address": "Beach Road, Visakhapatnam, Andhra Pradesh, India", "latitude": 17.7231, "longitude": 83.3035, "rating": 4.6, "review_count": 412, "phone": "+91 891 404 2155", "website": "https://www.google.com/maps/search/?api=1&query=Green+Park+Residency+Visakhapatnam", "source": "curated starter dataset"},
    {"name": "Srikalahasti Comfort Stay", "category": "hotel", "description": "Budget-friendly room option close to the temple circuit and local transit stops.", "address": "Srikalahasti, Tirupati district, Andhra Pradesh, India", "latitude": 13.7600, "longitude": 79.7000, "rating": 4.3, "review_count": 188, "phone": "+91 94900 77111", "website": "https://www.google.com/maps/search/?api=1&query=Srikalahasti+Comfort+Stay", "source": "curated starter dataset"},
    {"name": "Ananda River View Suites", "category": "hotel", "description": "Lake and river-facing stay with views, family rooms, and a relaxed evening vibe.", "address": "Rajahmundry, Andhra Pradesh, India", "latitude": 16.9891, "longitude": 81.7802, "rating": 4.7, "review_count": 521, "phone": "+91 90120 99884", "website": "https://www.google.com/maps/search/?api=1&query=Ananda+River+View+Suites+Rajahmundry", "source": "curated starter dataset"},
    {"name": "Royal Spice Kitchen", "category": "restaurant", "description": "Popular local dining spot for coastal seafood, Andhra meals, and family-style service.", "address": "RK Beach Road, Visakhapatnam, Andhra Pradesh, India", "latitude": 17.7125, "longitude": 83.3206, "rating": 4.5, "review_count": 680, "phone": "+91 98480 99912", "website": "https://www.google.com/maps/search/?api=1&query=Royal+Spice+Kitchen+Visakhapatnam", "source": "curated starter dataset"},
    {"name": "Beach Bite Café", "category": "restaurant", "description": "Casual café known for coffees, desserts, quick bites and evening ocean views.", "address": "Waltair Main Road, Visakhapatnam, Andhra Pradesh, India", "latitude": 17.7267, "longitude": 83.3273, "rating": 4.4, "review_count": 430, "phone": "+91 94901 66788", "website": "https://www.google.com/maps/search/?api=1&query=Beach+Bite+Café+Visakhapatnam", "source": "curated starter dataset"},
    {"name": "Tirupati Tiffin House", "category": "restaurant", "description": "A reliable stop for quick vegetarian meals, breakfast, and local snacks near the temple route.", "address": "Tirupati Main Road, Tirupati, Andhra Pradesh, India", "latitude": 13.6288, "longitude": 79.4192, "rating": 4.2, "review_count": 290, "phone": "+91 87908 44991", "website": "https://www.google.com/maps/search/?api=1&query=Tirupati+Tiffin+House", "source": "curated starter dataset"},
    {"name": "Visakhapatnam Airport Hub", "category": "transport", "description": "Airport access point for ride-hailing pickups, taxi coordination, and transit transfers.", "address": "Visakhapatnam International Airport, Andhra Pradesh, India", "latitude": 17.7207, "longitude": 83.2244, "rating": 4.1, "review_count": 155, "phone": "+91 891 271 1111", "website": "https://www.google.com/maps/search/?api=1&query=Visakhapatnam+Airport", "source": "curated starter dataset"},
    {"name": "Tirupati Metro Link", "category": "transport", "description": "Transit and local commuter interchange with bus and ride-hailing connectivity near the city core.", "address": "Tirupati Central Area, Andhra Pradesh, India", "latitude": 13.6289, "longitude": 79.4192, "rating": 4.0, "review_count": 97, "phone": "+91 97000 94777", "website": "https://www.google.com/maps/search/?api=1&query=Tirupati+Metro+Link", "source": "curated starter dataset"},
    {"name": "APSRTC City Depot", "category": "transport", "description": "Regional bus connect point for major routes, intercity transfers, and station access.", "address": "Madhurawada, Visakhapatnam, Andhra Pradesh, India", "latitude": 17.8290, "longitude": 83.3558, "rating": 4.1, "review_count": 210, "phone": "+91 891 255 4444", "website": "https://www.google.com/maps/search/?api=1&query=APSRTC+City+Depot+Visakhapatnam", "source": "curated starter dataset"},
)



def get_db_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", "instance/locateu.sqlite3"))


def get_db(path: str | Path | None = None) -> sqlite3.Connection:
    db_path = Path(path) if path else get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db(path: str | Path | None = None) -> None:
    with closing(get_db(path)) as connection:
        connection.executescript(SCHEMA)
        for place in STARTER_PLACES:
            connection.execute(
                """INSERT OR IGNORE INTO places
                   (name, category, description, address, latitude, longitude, verified)
                   VALUES (:name, :category, :description, :address, :latitude, :longitude, 0)""",
                place,
            )
            connection.commit()
