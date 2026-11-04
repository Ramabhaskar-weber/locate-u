# Architecture

```
Browser (PWA)                               FastAPI backend                         External (free)
┌───────────────────────────────┐   /api/v1  ┌──────────────────────────────┐       ┌────────────────────┐
│ React pages (lazy-loaded)     │──────────▶│ routes/ (system, geocode,     │──────▶│ Nominatim (1 req/s)│
│  Home · Map · India · State   │           │  india, account, extras)      │       │ Overpass           │
│  Saved · Settings · About     │           │ services/ (india, cache, geo) │       │ Open-Meteo         │
│ Zustand stores (settings, map,│           │ providers/ (throttle, httpx)  │       │ Wikipedia          │
│  saved, auth, toast)          │           │ SQLAlchemy models + Alembic   │       └────────────────────┘
│ TanStack Query (server state) │           └──────────────┬───────────────┘
│ Zod-validated API client      │                          │
│ IndexedDB: saved · responses ·│           PostgreSQL + PostGIS (geography GiST, pg_trgm)
│  history                      │           or SQLite for tests/dev
│ Service worker (Workbox)      │
└──────────────┬────────────────┘           data/processed/india/*.json ◀── data/scripts/build_india.py
               │ tiles (HTTP cache only)
               ▼
        OSM-compatible tile servers
```

## Key decisions

- **Provider abstraction.** `GeocodingProvider` is a protocol and `NominatimProvider` implements it. A self-hosted Nominatim, Photon or a paid geocoder can be added without touching routes or UI. The map layers come from `/config`, so tile providers are configuration, not code.
- **Nominatim policy.**
  - A global `asyncio` throttle (1 request/second) runs server-side.
  - The `User-Agent` identifies the app, and a contact email is optional.
  - Results are cached in the DB for 30 days, keyed by a normalised query or rounded coordinates.
  - The client never autocompletes against Nominatim. Typing searches the local India dataset; Enter searches the world.
- **Offline model.**
  - The Workbox precache holds the app shell.
  - `StaleWhileRevalidate` caches `/api/v1/india/*`.
  - The API client stores every successful response in IndexedDB. On a network failure it returns the stored copy with `fromCache: true` and the time it was stored. Every component shows a **Cached · 2 h ago** badge in that case, so cached data is never presented as live.
  - Map tiles are deliberately not cached for offline use.
- **Data honesty in the UI.** `SourceBadge` has distinct visuals for *Live*, *Cached*, *Local dataset* and *Local fallback*. Empty-state copy explains when absence means "not in the dataset" rather than "doesn't exist".
- **Spatial queries.** On Postgres, migration `0002` adds `places.geom geography(Point,4326)` with a GiST index, and `nearest()` uses `ST_DWithin` + `<->`. On SQLite, a bounding-box prefilter plus haversine gives the same API.
- **Saved places.** These are device-first (IndexedDB). Sync is opt-in (sign in **and** a toggle). Deletes of synced items keep a tombstone until they are pushed. `/saved/sync` does upserts with ownership checks.

## Security model

| Concern | Measure |
|---|---|
| Secrets | Backend-only env vars; `/config` exposes none; `VITE_*` holds only public values; CI greps the built bundle |
| Passwords | scrypt (N=2¹⁴, r=8, p=1) with a 16-byte random salt, compared in constant time |
| Sessions | HS256 JWT with `typ=access` and expiry; the production config demands a ≥32-char secret |
| Input | Pydantic constraints on every query/body; Zod on every response and form |
| SQL | SQLAlchemy ORM / bound parameters only |
| CORS | Explicit origin list; wildcard rejected in production |
| Headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy: geolocation=(self)`, COOP, `Cache-Control: no-store` for user data |
| Abuse | Per-IP sliding-window rate limit; provider throttles; request size limits via Pydantic |
| Location privacy | Requested only on user action; not logged; cache keys rounded; saved places local unless sync is on |

## Frontend structure

```
src/
  components/ui/          Glass, Card, Button, IconButton, Input, Select, Switch, Segmented, Modal,
                          Skeleton, EmptyState, ErrorState, Badge, SourceBadge, Stat, Kbd
  components/layout/      AppShell (sidebar + mobile tab bar), CommandPalette, OfflineBanner, Toaster,
                          UpdatePrompt (SW), ErrorBoundary, Logo
  components/map/         MapView (layers, overlays, markers, measure), MapControls, LayerPanel, SearchPanel
  components/location/    LocationCard, sections (weather, sun, India context, nearby, wiki), SaveDialog
  components/india/       CascadeSelector, StateMap
  components/account/     AccountPanel (login/register with RHF + Zod, sync, delete)
  lib/                    api, schemas (Zod), db (idb), geo, directions, exporters, format
  stores/                 settings, map, saved, auth, toast (Zustand)
  hooks/                  online, debounce, geolocation, install prompt, hotkeys, config
  pages/                  Home, Map, India, State, Saved, Settings, About, NotFound
```
