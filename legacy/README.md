# Legacy prototype (not used)

`flask-app/` is the earlier Flask + Google Maps prototype from the uploaded `Locate-u.zip`, kept unchanged for reference as the brief says not to delete existing work without explanation. Removed from the copy: the committed `.venv/` (Windows binaries), `__pycache__/` and the local `instance/locateu.sqlite3` database, which are build artefacts or local data and should never be in Git.

It is replaced by the new stack (React + FastAPI + PostGIS) because the brief mandates that architecture, and the prototype depended on paid Google Maps APIs, which are not authorised. Its ideas (favourites, itineraries, curated destinations) can be revisited in Stage 2.
