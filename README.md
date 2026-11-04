# Locate U

**A premium travel companion for India, built to grow worldwide.** Locate U is a responsive website and installable PWA. It has a world map, place search, a validated explorer covering all **28 states and 8 Union Territories**, saved places that work offline, and a "liquid glass" design with light and dark themes.

> Stage 1 foundation, plus a few extra free features (weather, Wikipedia, nearby essentials). Everything uses free, open services. **No paid API is used.**

| Home (light) | Home (dark) | India explorer |
|---|---|---|
| ![](docs/screenshots/home-light.png) | ![](docs/screenshots/home-dark.png) | ![](docs/screenshots/india-explorer.png) |
| **World map + details** | **District view (dark)** | **Mobile bottom sheet** |
| ![](docs/screenshots/map-india-boundaries.png) | ![](docs/screenshots/state-karnataka-dark.png) | ![](docs/screenshots/mobile-map-sheet.png) |

*The screenshots were taken in a sandbox that blocks external tile servers, so the street map is blank. Overlays, data and UI are real. On a normal connection, OpenStreetMap tiles load behind them.*

---

## Features

**Stage 1 (all 20 items from the brief)**

| # | Feature | Where |
|---|---|---|
| 1 | Modular monorepo: `frontend/`, `backend/`, `data/`, `docs/` | repo layout |
| 2 | Responsive home dashboard (coverage stats, saved, recent, quick actions) | `/` |
| 3 | Liquid-glass design system (glass surfaces, tokens, accessible components) | `src/components/ui`, `src/index.css` |
| 4 | Light / dark / system theme, no flash on load | sidebar toggle, Settings |
| 5 | World map (Leaflet + React-Leaflet, OSM tiles, attribution, scale bar) | `/map` |
| 6 | World place search: Nominatim runs **only on explicit submit**, cached and throttled | map search, `Ctrl K` |
| 7 | Reverse geocoding, with an offline-capable fallback to the local India dataset | tap the map |
| 8 | Current location, with permission prompt / granted / denied / timeout / unsupported states | ⌖ button, Home |
| 9 | Map click → coordinates (DD / DMS / DDM) and a live cursor read-out | map |
| 10 | Configurable map-layer architecture (served by `/api/v1/config`) | Layers panel |
| 11 | Directions links: OpenStreetMap, Google Maps, Apple Maps and `geo:` URIs (no API key) | detail card |
| 12 | India explorer | `/india`, `/india/:code` |
| 13 | All 28 states + 8 UTs, validated in tests | dataset + `test_dataset.py` |
| 14 | State/UT → district → city/town cascading selectors | explorer |
| 15 | Geographic dataset import pipeline (fetch → build → validate → DB import) | `data/scripts`, `app.cli` |
| 16 | Location detail card | map & state pages |
| 17 | Saved locations (IndexedDB, persist across browser restarts) | `/saved` |
| 18 | PWA: manifest, service worker, offline app shell + cached data | install prompt, Settings |
| 19 | Loading skeletons, empty states, error states with retry, offline banner | everywhere |
| 20 | Automated tests: 71 pytest + 27 Vitest + 12 Playwright | see [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) |

**Extras beyond the brief (all free, all real data, each can be switched off)**

- **Command palette** (`Ctrl K` / `/`): instant India suggestions from the local dataset, navigation, recent items and saved places.
- **Paste coordinates** (`17.385, 78.4867` or `17°23'6"N 78°29'12"E`) to jump straight there, with no geocoder call.
- **Plus Codes** (Open Location Code), **sunrise/sunset** (computed locally), **local time**, **distance and bearing from you**.
- **Distance measuring tool** on the map (multi-point, undo).
- **Weather**: current conditions plus a 7-day forecast from Open-Meteo (free, no key).
- **Wikipedia**: geotagged articles near any point.
- **Nearby essentials** from OpenStreetMap via Overpass: hospitals, pharmacies, police, ATMs, fuel/EV charging, toilets, stations, attractions, food, stays, parks and sports facilities. Only real OSM features are shown, with no ratings or prices.
- **Map layers**: OSM Standard, Humanitarian, Topographic and CyclOSM, plus state/UT and district boundary overlays.
- **Saved places**: collections, tags, notes, colours, search/filter/sort (including nearest), undo delete, and **import/export** as JSON, GeoJSON, CSV or GPX.
- **Optional accounts** (hashed passwords, JWT) with **opt-in cloud sync** of saved places, plus account deletion.
- **Share links** (Web Share API or copy), deep links like `/map?lat=..&lon=..&z=..`, and `/map?q=..`.
- Place-name language for 14 languages (including Hindi, Telugu, Tamil, Kannada, Malayalam and Bengali), plus an "India only" search toggle.
- Settings for offline storage: usage, persistent storage request, clearing the cache and history.
- Single-image **Docker** deploy (FastAPI serves the PWA), `docker-compose` with PostGIS, and **CI** on GitHub Actions.

## Architecture

```
locate-u/
├── frontend/   React 18 + TypeScript + Vite + Tailwind, Zustand, TanStack Query, RHF + Zod, Leaflet, vite-plugin-pwa, idb
├── backend/    FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, httpx; PostgreSQL + PostGIS (SQLite for tests)
├── data/       scripts/fetch_sources.py, scripts/build_india.py → processed/india/* (committed)
├── docs/       API.md · DATA_SOURCES.md · ARCHITECTURE.md · TEST_RESULTS.md · screenshots/
└── legacy/     the earlier Flask prototype, kept for reference (not used)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data flows, caching and the security model.

## Quick start

Requirements: **Python 3.11+**, **Node 20+**, and optionally **PostgreSQL 14+ with PostGIS 3**.

```bash
cd locate-u
cp .env.example .env            # then set SECRET_KEY; for quick dev you can delete the DATABASE_URL line → SQLite
pip install -r backend/requirements-dev.txt
(cd frontend && npm ci)

# terminal 1 — API on http://127.0.0.1:8000 (runs migrations + imports the India dataset on first start)
cd backend && uvicorn app.main:app --reload --port 8000

# terminal 2 — PWA on http://localhost:5173 (proxies /api → :8000)
cd frontend && npm run dev
```

Windows PowerShell: use `Copy-Item .env.example .env`, `py -m pip install ...`. The other commands are the same.

**PostgreSQL + PostGIS setup**

```sql
CREATE USER locate_user WITH PASSWORD 'choose-a-password';
CREATE DATABASE locate_u OWNER locate_user;
\c locate_u
CREATE EXTENSION postgis;          -- or let the migration create it if the user has permission
```

Then set `DATABASE_URL=postgresql+psycopg://locate_user:...@localhost:5432/locate_u` and run `cd backend && python -m app.cli import-india`.

**Production / single container**

```bash
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
docker compose up --build         # → http://localhost:8000 (PostGIS + API + PWA)
```

Production mode refuses to start with a weak `SECRET_KEY`, `DEBUG=true` or wildcard CORS. Serve it over HTTPS (needed for PWA install and geolocation on phones).

**Testing on your Android phone (same Wi-Fi):** run `npm run build`, then `uvicorn app.main:app --host 0.0.0.0 --port 8000`, and open `http://<your-PC-IP>:8000`. Geolocation and PWA install need HTTPS on non-localhost origins, so use a tunnel such as `cloudflared` or `ngrok`, or Chrome's port-forwarding (`chrome://inspect`).

## Commands

| Task | Command |
|---|---|
| Backend tests (SQLite) | `cd backend && python -m pytest` |
| Backend tests on PostgreSQL/PostGIS | `TEST_DATABASE_URL=postgresql+psycopg://… python -m pytest` |
| Frontend type-check + unit tests | `cd frontend && npm run typecheck && npm test` |
| End-to-end (builds, starts the API on :8010) | `cd frontend && npm run build && npx playwright test` |
| Rebuild the India dataset | `python data/scripts/fetch_sources.py && python data/scripts/build_india.py` |
| Re-import into the DB | `cd backend && python -m app.cli import-india [--only TG AP]` |
| Dataset coverage report | `cd backend && python -m app.cli coverage` |
| Purge expired provider cache | `cd backend && python -m app.cli purge-cache` |
| Interactive API docs | http://127.0.0.1:8000/api/docs |

## Data, honesty and limits

- **36/36 states and UTs**, **640 Census-2011 district polygons** (reconciled to today's Telangana, Ladakh and DNH&DD), and **7,967 populated places** (GeoNames ≥ 500 people + the CSC cities database). Every record keeps its source ID.
- Districts created **after 2011 are not shown separately**, and **villages are mostly missing**. The UI and `/about` say so plainly.
- Live, cached, local-dataset and unavailable data are always labelled differently in the UI.
- No satellite imagery, no offline map tiles (OSM tile policy), and no hotels/prices/reviews/transport/AI (future stages).

Full details are in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Security & privacy

Passwords are stored as salted **scrypt** hashes. JWTs are signed with a server-only secret. All inputs are validated with Pydantic (server) and Zod (client). The ORM is used everywhere (no string SQL from user input). CORS is restricted to configured origins. Security headers are set (`nosniff`, `DENY` framing, `Referrer-Policy`, `Permissions-Policy: geolocation=(self)`). There is a per-IP rate limit. `.env` is git-ignored and the frontend bundle contains no secrets (checked in CI). Location is requested only on a user action. Saved places stay on the device unless the user signs in **and** turns on sync.

## Stage status

Stage 1 is complete and tested ([test results](docs/TEST_RESULTS.md)). **Stage 2** (accommodation, food, transport, utilities, sports, listings, reviews) and AI features have **not** been started, and paid services need your explicit approval.
