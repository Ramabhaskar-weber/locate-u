# Locate U API (v1)

Base path: `/api/v1`. Interactive OpenAPI docs are at `/api/docs` (Swagger) and `/api/redoc`. Schema: `/api/openapi.json`.

All errors share one envelope:

```json
{ "error": { "code": "provider_unreachable", "message": "Could not reach Nominatim", "provider": "Nominatim" }, "detail": "Could not reach Nominatim" }
```

Error codes: `validation_error` (422, with `fields[]`), `not_found`, `unauthorized`, `conflict`, `invalid_request`, `rate_limited` (429 + `Retry-After`), `provider_unreachable` / `provider_timeout` / `provider_rate_limited` (503/504), `provider_error` (502).

## System

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Status, version, environment and DB dialect |
| GET | `/config` | Public config: map layers, feature flags, nearby categories, geocoding policy. **Never contains secrets.** |
| GET | `/meta/sources` | Dataset manifest, last import, external services, cache stats |

## Geocoding (Nominatim, cached and throttled)

| Method | Path | Query |
|---|---|---|
| GET | `/geocode/search` | `q` (2–200 chars), `limit` (1–20), `lang` (`en`, `hi`, …), `country` (`in` or `in,np`) |
| GET | `/geocode/reverse` | `lat`, `lon`, `zoom` (3–18), `lang` |

Search response: `{ query, results: GeoPlace[], cached, fetched_at, provider, attribution }`.

`GeoPlace` = `{ id: "osm:R1942586", name, display_name, lat, lon, category, type, importance, osm_type, osm_id, bbox: [w,s,e,n], address: {...}, source, licence }`.

Reverse response: `{ lat, lon, result: GeoPlace|null, nearest_india_places: NearestPlace[], cached, fetched_at, provider }`. If Nominatim is unreachable, `provider` is `"local-fallback"` and the local dataset still answers.

## India dataset

| Method | Path | Notes |
|---|---|---|
| GET | `/india/states?type=state\|union_territory` | 36 records, cacheable |
| GET | `/india/coverage` | Counts, expected 28/8, per-state counts, last import + validation, manifest |
| GET | `/india/search?q=&state=&limit=` | Instant local search across states, districts and places (exact > prefix > contains, then population) |
| GET | `/india/nearest?lat=&lon=&limit=&max_km=` | Nearest dataset places (PostGIS `<->` KNN on Postgres; haversine fallback) |
| GET | `/india/{code}` | State/UT + its districts |
| GET | `/india/{code}/districts` | Districts |
| GET | `/india/{code}/places?district=&q=&min_population=&sort=population\|name&limit=&offset=` | Paged places. A district from another state returns **422** (relationship validated). |
| GET | `/india/places/{id}` | Place + district + state + nearby places |
| GET | `/india/boundaries/states` | Simplified state/UT GeoJSON |
| GET | `/india/boundaries/{code}` | Simplified district GeoJSON for one state/UT |

## Preview providers (free; can be disabled)

| Method | Path | Notes |
|---|---|---|
| GET | `/weather?lat=&lon=` | Open-Meteo current + 7-day; `{data, cached, fetched_at}` |
| GET | `/wiki/nearby?lat=&lon=&lang=&radius=` | Geotagged Wikipedia articles |
| GET | `/wiki/summary?title=&lang=` | Article summary |
| GET | `/nearby?lat=&lon=&category=&radius=` | OSM features via Overpass. `category` ∈ hospital, pharmacy, police, atm, fuel, toilets, transit, attraction, worship, food, stay, park, sports |

## Accounts & saved places (optional)

Auth uses `Authorization: Bearer <token>`.

| Method | Path | Body / notes |
|---|---|---|
| POST | `/auth/register` | `{email, password (≥8, mixed), display_name}` → `{access_token, expires_in, user}` |
| POST | `/auth/login` | `{email, password}` |
| GET | `/auth/me` | Current user |
| DELETE | `/auth/me` | Deletes the account and all server-side saved places |
| GET | `/saved` | The user's saved places |
| POST | `/saved` | `{name, lat, lon, address?, note?, tags[], collection?, color?(#rrggbb), source, source_ref?}` |
| PUT | `/saved/{id}` | Update (owner only; other users' rows return 404) |
| DELETE | `/saved/{id}` | Delete (owner only) |
| POST | `/saved/sync` | `{items: SavedIn[]}`: upsert the device's list, returns the merged server list |

Limits: 1,000 saved places per user. The API rate limit defaults to 120 requests/minute per IP (`RATE_LIMIT_PER_MINUTE`).
