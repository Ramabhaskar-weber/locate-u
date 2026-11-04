# Locate U

**Explore Anywhere. Discover Everything. Travel Smarter.** Locate U is a Flask and SQLite tourism discovery app with an interactive Google map, Places autocomplete, a curated Andhra Pradesh starter collection, favorites, personal itineraries and a small admin console.

## Architecture

```text
app.py                 Flask app factory, session security, CSRF, rate limits, blueprints
 database.py            SQLite schema, indexes, starter destination records
 auth.py                Registration, login, profile and logout
 discovery.py           Destination pages, search, nearby, geocoding and favorites APIs
 planning.py            User-owned itinerary and itinerary-item CRUD
 admin.py               Admin-only destination management and account statistics
 services.py            Places API (New), geocoding, distance and recommendation logic
templates/              Jinja pages and shared layout
static/css/style.css    Responsive design system and light/dark themes
static/js/              Search, Google Maps and itinerary interactions
tests/                  Database and Flask integration tests
```

## Local setup (Windows PowerShell)

1. Install Python 3.11 or newer. From this folder, create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

2. Set `FLASK_SECRET_KEY` in `.env` to a long random value. Generate one with:

   ```powershell
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

   Google Maps is optional. To enable the interactive map, set `GOOGLE_MAPS_BROWSER_KEY` and `GOOGLE_MAPS_SERVER_KEY` in `.env` as described below. The browser key is necessarily visible to the browser and must be restricted to your HTTP referrers and Maps JavaScript API; never put the server key in a template or browser script.

3. Run the app:

   ```powershell
   python app.py
   ```

   Open `http://127.0.0.1:5000`. The database is created at `instance/locateu.sqlite3` and the starter destinations are seeded automatically. Set `FLASK_DEBUG=1` only for local development. For HTTPS deployments, set `COOKIE_SECURE=1` and provide a stable secret.

## Google Maps Platform

Google-backed features are optional; the application runs without API keys and clearly falls back to local curated records. To enable them:

1. Create a Google Cloud project, attach an active billing account, enable billing, and enable **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, and **Directions API**.
2. Set `GOOGLE_MAPS_BROWSER_KEY` and `GOOGLE_MAPS_SERVER_KEY` in `.env`. The browser key loads the interactive map; the server key is used only by Flask for Places, photos and geocoding requests.
3. Restrict the browser key to your application HTTP referrers and Maps JavaScript API. Restrict the server key to your server IP and only the Places API (New), Geocoding API and any server APIs you use. Never put the server key in a template or browser script.
4. Review current Google Maps Platform pricing, quotas, attribution and storage policies before production. Requests may incur charges; set quota alerts and budgets. No cost or live availability is guaranteed by this app.

The browser integration uses the current Maps JavaScript `importLibrary` flow and `PlaceAutocompleteElement`. Nearby discovery calls Places API (New) with a field mask and up to 20 results. Geocoding is performed server-side. The map can render directions through the Maps JavaScript Directions service; external Google Maps directions links are provided as a fallback. Ride links, hotel booking, transit timetables, room inventory and reservations are not provider integrations and are not represented as live.

## Data, recommendations and admin

The Andhra Pradesh seed collection contains Araku Valley, Borra Caves, Gandikota, Lepakshi, Tirumala, Srikalahasti Temple, Konaseema, Papikondalu, Kakinada Beach and Maredumilli. They are local starter references: `verified=0`, with no invented ratings, hours, reviews, booking data or availability. Regional coordinates are approximate map points and should be validated against authoritative sources before publishing them as verified destinations. Google results are provider-supplied and their freshness depends on Google.

Recommendations use available components only: distance (35%), rating (30%), selected category or saved preference (20%), and review count (15%). Weights are renormalized when data is missing. Without a location or provider rating/review count, those components are omitted; the app does not fabricate ratings. Current user-preference storage is prepared in SQLite; category selection is currently provided as a search filter.

To grant administrator access, register the account first, then update its row using a trusted local SQLite client:

```sql
UPDATE users SET is_admin = 1 WHERE email = 'admin@example.com';
```

Never expose the admin console publicly without operational access controls, backups and a reviewed moderation policy.

## Tests

```powershell
python -m unittest discover -s tests -v
```

Tests use temporary SQLite databases and Flask's test client. External Google APIs are not called in the test suite.

## Production notes

Use a production WSGI server (for example Waitress on Windows), HTTPS, a stable secret, persistent protected database storage, backups, log monitoring and a reverse proxy with request limits. The built-in in-memory rate limiter is process-local; use shared Redis storage for multi-worker deployments. SQLite is appropriate for a small deployment; move to a managed relational database as concurrent writes and operational requirements grow. Location is requested only after a user action and is not written to search history; search terms are stored only for signed-in accounts.
