# Data sources, licences & coverage

## India administrative dataset (`data/processed/india`)

Built by `data/scripts/build_india.py` from three open sources. The raw downloads are recorded with URL, size, SHA-256 and retrieval time in `data/raw/SOURCES.lock.json`.

| Source | Used for | Licence | Snapshot |
|---|---|---|---|
| [DataMeet India — Census 2011 districts](https://github.com/datameet/maps) (`dists11.geojson`) | District polygons; state membership | **CC BY 4.0**: "India boundaries by DataMeet India community" | Census 2011; retrieved 2026-11-04 |
| [GeoNames](https://www.geonames.org/) `cities500` via the [`geonamescache` 3.0.2](https://pypi.org/project/geonamescache/) package | Populated places ≥ 500 people, population, `geonameid` | **CC BY 4.0** (data); MIT (package) | GeoNames data as of Feb 2020 |
| [countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database) (dr5hn) | Official list of 36 states/UTs with ISO codes; extra city records | **ODbL 1.0**: "© dr5hn/countries-states-cities-database contributors" | retrieved 2026-11-04 |

**Attribution requirement:** the About page (`/about`) shows every source, licence, retrieval date and hash. Any redistribution of `data/processed/india` must keep these attributions. ODbL also requires that derived databases be shared under ODbL.

### Pipeline

1. **States/UTs**: an official list of 28 states and 8 UTs with ISO 3166-2:IN codes, checked against the CSC source. The build fails if the counts differ.
2. **District reconciliation**: the 2011 state names are mapped to the current 36 using documented legal changes only:
   - Andhra Pradesh Reorganisation Act 2014 → 10 districts move to **Telangana** (Adilabad, Hyderabad, Karimnagar, Khammam, Mahbubnagar, Medak, Nalgonda, Nizamabad, Rangareddy, Warangal)
   - J&K Reorganisation Act 2019 → Leh and Kargil move to **Ladakh**
   - The 2020 merger → Dadra & Nagar Haveli and Daman & Diu become **DH**
   - One polygon marked "Data Not Available" in the source is excluded (it is listed in `validation.json`)
3. **Place → district** by point-in-polygon (Shapely STRtree). A point up to **8 km** outside every polygon (coastline simplification) snaps to the nearest district and is flagged `assignment: "nearest"`. Points further out are **dropped**, not guessed.
4. **Cross-source merge**: a GeoNames and a CSC record with the same normalised name in the same district, within 4 km of each other, become one record with both IDs (`sources: {geonames, csc}`).
5. **Validation**: CSC's own state is compared with the polygon-derived state. Mismatches are reported, not "fixed". Most are source errors, e.g. CSC lists Yanam under AP, but it is in Puducherry.
6. **Outputs**:
   - `states.json`
   - `states/{CODE}.json`, lazy-loaded per state/UT
   - `boundaries/{CODE}.geojson` (simplified ~400 m for display)
   - `boundaries/india-states.geojson`
   - `search-index.json`
   - `manifest.json` (sources and coverage note)
   - `validation.json` (full report)

### Coverage (build of 2026-11-04)

| Metric | Value |
|---|---|
| States / UTs | **28 / 8**, all present |
| District polygons | 640 (Census 2011, after reconciliation) |
| Input place records | 11,429 |
| Output places | **7,967** (7,086 with GeoNames ID, 881 CSC-only) |
| Point-in-polygon / snapped / dropped | 11,384 / 37 / 8 |
| Cross-source merges | 3,454 |
| CSC state mismatches reported | 24 |

**What is not covered, honestly:**

- India now has ~780 districts. Districts created after 2011 are **not separate**: their towns appear under the 2011 parent district. For example, Andhra Pradesh shows 13 districts, not today's 26.
- Settlements under ~500 people, and many villages, are **not included**. This is not a full gazetteer.
- GeoNames populations are estimates of varying age.
- Boundaries are suitable for display and assignment. They are **not** authoritative legal boundaries.

**Upgrade path:** swap in Local Government Directory (LGD) district lists, or Survey of India / Bhuvan boundaries where the licence allows, and import the full GeoNames `IN.txt` dump with `admin2` codes. The pipeline is designed so only the loaders change.

## Live services (free, no API keys)

| Service | Purpose | Policy we follow |
|---|---|---|
| OpenStreetMap tiles (`tile.openstreetmap.org`) | Base map | Visible attribution; normal HTTP caching only; **no SW/offline tile caching or bulk download**; not unlimited production infrastructure. Switch `OSM_TILE_URL` to your own or a commercial tile server for scale. |
| OSM France Humanitarian, OpenTopoMap, CyclOSM | Alternative styles | Attribution shown per layer; light use only |
| Nominatim | Search & reverse geocoding | ≤ 1 request/s (global server-side throttle), identifying User-Agent (+ optional contact email), **explicit-submit search only (no autocomplete)**, 30-day DB cache, coordinates rounded for cache keys |
| Overpass API | Nearby essentials | Throttled to 1 request/s, 1-day cache, radius ≤ 5 km, 60 results max |
| Open-Meteo | Weather | Free non-commercial tier; 30-min cache; CC BY 4.0 attribution |
| Wikipedia (MediaWiki API) | Nearby articles / summaries | CC BY-SA 4.0 attribution; 7-day cache |

Instant suggestions while typing come **only** from the local India dataset served by our own backend.
