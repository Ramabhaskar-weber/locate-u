# Test results — Stage 1 (2026-11-04)

Environment: Linux, Python 3.13, Node 22, Chromium (Playwright 1.63), PostgreSQL 16 + PostGIS 3.

| Suite | Command | Result |
|---|---|---|
| Backend on SQLite | `cd backend && python -m pytest` | **71 passed** |
| Backend on PostgreSQL + PostGIS | `TEST_DATABASE_URL=postgresql+psycopg://… python -m pytest` | **71 passed** (runs the real Alembic migrations, PostGIS KNN path) |
| Frontend type-check | `npm run typecheck` | **0 errors** (strict, noUnused*) |
| Frontend unit tests | `npm test` (Vitest + Testing Library + fake-indexeddb) | **27 passed** |
| Production build | `npm run build` | OK; PWA precache 30 entries |
| End-to-end | `npx playwright test` (desktop 1366×860 + Pixel 7) | **12 passed** |
| Browser console | All 7 routes, dev and prod builds | No errors (except blocked external hosts in the sandbox) |
| Secrets in bundle | `grep -rE "SECRET_KEY\|GEMINI\|GOOGLE_MAPS_API\|…" frontend/dist` | none |

## What the tests cover

**Backend (`backend/tests`)**
- Health, security headers, CORS allow/deny, public config has no secrets, 404 envelope.
- Nominatim search: normalisation, User-Agent, caching (the second call doesn't hit upstream), validation, provider down (503), provider 429.
- Reverse geocoding plus nearest India places; **local fallback** when Nominatim is down; coordinate bounds.
- India: listing, state detail, Ladakh reorganisation, cascade filtering, **cross-state district rejected (422)**, sorting/paging, search ranking, place detail, nearest, boundaries, path-traversal guard, honest coverage note.
- Preview providers (Open-Meteo, Overpass, Wikipedia) with mocked upstreams.
- Accounts: scrypt hashing, register/login/me, duplicates, weak password, auth required, **ownership isolation**, validation, sync upsert, account deletion.
- Dataset integrity for **all 36 files**: the official 28 + 8 list, district/state membership, coordinates inside the state bbox, source IDs present, reorganisation rules applied.

**Frontend unit tests**: geo maths (haversine, DMS, coordinate parsing, Plus Codes against exact-arithmetic reference values, sunrise/sunset, bearings), directions links (no origin leak by default), import/export round-trip and escaping, API client (Zod validation, IndexedDB offline fallback, error mapping), saved store persistence across a simulated restart, UI primitives' accessibility, form schemas.

**End-to-end**: dashboard coverage + theme switch; India explorer cascade → map details; state page + relationship check; map click → save → persists after reload; explicit-submit world search (no request while typing); typed coordinates; geolocation granted **and** denied; command palette; **PWA manifest + service worker + offline reload still shows India data**; error, empty and 404 states; mobile tab bar, no horizontal overflow, bottom-sheet card.

## Defects found and fixed during testing

1. `Permissions-Policy: geolocation=()` blocked "my location" when the backend served the PWA. Changed to `geolocation=(self)`, with a regression test.
2. Icon buttons rendered squeezed icons (a padding-utility order conflict). Fixed with `!px-0` and non-shrinking SVGs.
3. Map controls were hidden behind the desktop detail card. They now shift beside it.
4. Plus Code float rounding could change the last digit. Switched to integer arithmetic.
5. Unknown `/api/*` routes returned FastAPI's default body. They now use the standard error envelope.

## Not verifiable in this sandbox (verify on your machine)

- **Real OSM tiles, Nominatim, Overpass, Open-Meteo and Wikipedia** responses: outbound access to those hosts is blocked here. The integrations are covered by mocked tests; please confirm live on a normal connection.
- **PWA installation** on a real Android phone (needs HTTPS or localhost). The manifest, icons and service worker are verified.
- Physical-device GPS accuracy.
