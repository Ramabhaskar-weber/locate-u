#!/usr/bin/env python3
"""Build the processed India geographic dataset for Locate U.

Pipeline
========
1. Load DataMeet Census-2011 district polygons and reconcile their 2011 state
   names with today's 28 states and 8 Union Territories (documented rules
   only — Telangana 2014, Ladakh 2019, DNH&DD merger 2020).
2. Load populated places from GeoNames (cities500) and from the
   countries-states-cities database (CSC).
3. Assign every place to a district by point-in-polygon. A place that falls
   just outside every polygon (coastline simplification) is snapped to the
   nearest district only when it is within ``SNAP_KM``; otherwise it is
   reported as unassigned and dropped — nothing is guessed.
4. Merge records that both sources describe (same normalised name within
   ``MERGE_KM``) while keeping every source identifier.
5. Cross-check the CSC state with the polygon-derived state and report
   mismatches.
6. Write lazy-loadable per-state/UT JSON files, simplified boundary GeoJSON,
   a manifest with source metadata and a validation report.

Nothing in this script invents a coordinate, a place or a relationship: all
output records are traceable to a source identifier.
"""
from __future__ import annotations

import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from shapely.geometry import Point, mapping, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw"
OUT = ROOT / "processed" / "india"

SNAP_KM = 8.0
MERGE_KM = 4.0
SIMPLIFY_DISTRICT = 0.004  # degrees (~400 m) — display only
SIMPLIFY_STATE = 0.01

# Official 28 states and 8 Union Territories (ISO 3166-2:IN style codes used by CSC).
STATES: dict[str, tuple[str, str, str]] = {
    # code: (name, type, capital)
    "AP": ("Andhra Pradesh", "state", "Amaravati"),
    "AR": ("Arunachal Pradesh", "state", "Itanagar"),
    "AS": ("Assam", "state", "Dispur"),
    "BR": ("Bihar", "state", "Patna"),
    "CT": ("Chhattisgarh", "state", "Raipur"),
    "GA": ("Goa", "state", "Panaji"),
    "GJ": ("Gujarat", "state", "Gandhinagar"),
    "HR": ("Haryana", "state", "Chandigarh"),
    "HP": ("Himachal Pradesh", "state", "Shimla"),
    "JH": ("Jharkhand", "state", "Ranchi"),
    "KA": ("Karnataka", "state", "Bengaluru"),
    "KL": ("Kerala", "state", "Thiruvananthapuram"),
    "MP": ("Madhya Pradesh", "state", "Bhopal"),
    "MH": ("Maharashtra", "state", "Mumbai"),
    "MN": ("Manipur", "state", "Imphal"),
    "ML": ("Meghalaya", "state", "Shillong"),
    "MZ": ("Mizoram", "state", "Aizawl"),
    "NL": ("Nagaland", "state", "Kohima"),
    "OR": ("Odisha", "state", "Bhubaneswar"),
    "PB": ("Punjab", "state", "Chandigarh"),
    "RJ": ("Rajasthan", "state", "Jaipur"),
    "SK": ("Sikkim", "state", "Gangtok"),
    "TN": ("Tamil Nadu", "state", "Chennai"),
    "TG": ("Telangana", "state", "Hyderabad"),
    "TR": ("Tripura", "state", "Agartala"),
    "UP": ("Uttar Pradesh", "state", "Lucknow"),
    "UK": ("Uttarakhand", "state", "Dehradun"),
    "WB": ("West Bengal", "state", "Kolkata"),
    "AN": ("Andaman and Nicobar Islands", "union_territory", "Sri Vijaya Puram"),
    "CH": ("Chandigarh", "union_territory", "Chandigarh"),
    "DH": ("Dadra and Nagar Haveli and Daman and Diu", "union_territory", "Daman"),
    "DL": ("Delhi", "union_territory", "New Delhi"),
    "JK": ("Jammu and Kashmir", "union_territory", "Srinagar (summer) / Jammu (winter)"),
    "LA": ("Ladakh", "union_territory", "Leh"),
    "LD": ("Lakshadweep", "union_territory", "Kavaratti"),
    "PY": ("Puducherry", "union_territory", "Puducherry"),
}

# Census-2011 state names in the DataMeet file → current code.
STATE_2011 = {
    "Andaman & Nicobar Island": "AN", "Andhra Pradesh": "AP", "Arunanchal Pradesh": "AR",
    "Assam": "AS", "Bihar": "BR", "Chandigarh": "CH", "Chhattisgarh": "CT",
    "Dadara & Nagar Havelli": "DH", "Daman & Diu": "DH", "Goa": "GA", "Gujarat": "GJ",
    "Haryana": "HR", "Himachal Pradesh": "HP", "Jammu & Kashmir": "JK", "Jharkhand": "JH",
    "Karnataka": "KA", "Kerala": "KL", "Lakshadweep": "LD", "Madhya Pradesh": "MP",
    "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "ML", "Mizoram": "MZ",
    "NCT of Delhi": "DL", "Nagaland": "NL", "Odisha": "OR", "Puducherry": "PY",
    "Punjab": "PB", "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN",
    "Tripura": "TR", "Uttar Pradesh": "UP", "Uttarakhand": "UK", "West Bengal": "WB",
}

# Districts transferred by later reorganisation acts (documented in DATA_SOURCES.md).
REORG = {
    # Andhra Pradesh Reorganisation Act, 2014 → Telangana
    ("AP", "Adilabad"): "TG", ("AP", "Hyderabad"): "TG", ("AP", "Karimnagar"): "TG",
    ("AP", "Khammam"): "TG", ("AP", "Mahbubnagar"): "TG", ("AP", "Medak"): "TG",
    ("AP", "Nalgonda"): "TG", ("AP", "Nizamabad"): "TG", ("AP", "Rangareddy"): "TG",
    ("AP", "Warangal"): "TG",
    # Jammu and Kashmir Reorganisation Act, 2019 → Ladakh
    ("JK", "Leh (ladakh)"): "LA", ("JK", "Kargil"): "LA",
}
DISTRICT_RENAMES = {"Leh (ladakh)": "Leh", "Y.s.r.": "YSR Kadapa"}
EXCLUDED_DISTRICTS = {"Data Not Available"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def km(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def slug(s: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")


def rnd(x: float, n: int = 5) -> float:
    return round(float(x), n)


def load_districts():
    raw = json.loads((RAW / "dists11.geojson").read_text())
    districts, excluded = [], []
    for f in raw["features"]:
        p = f["properties"]
        name = p["DISTRICT"].strip()
        st = STATE_2011[p["ST_NM"]]
        if name in EXCLUDED_DISTRICTS:
            excluded.append({"state_2011": p["ST_NM"], "district": name,
                             "reason": "Source marks polygon as 'Data Not Available'"})
            continue
        code = REORG.get((st, name), st)
        geom = shape(f["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)
        census = int(p["censuscode"]) if p.get("censuscode") is not None else None
        districts.append({
            "id": f"{code}-{census}" if census else f"{code}-{slug(name)}",
            "name": DISTRICT_RENAMES.get(name, name),
            "name_2011": name,
            "state_code": code,
            "state_2011": p["ST_NM"],
            "census_2011_code": census,
            "geom": geom,
        })
    return districts, excluded


def load_places():
    out = []
    g = json.loads((RAW / "geonames_cities500.json").read_text())
    for rec in g.values():
        if rec.get("countrycode") != "IN":
            continue
        out.append({
            "name": rec["name"], "lat": float(rec["latitude"]), "lon": float(rec["longitude"]),
            "population": int(rec.get("population") or 0) or None,
            "sources": {"geonames": int(rec["geonameid"])}, "csc_state": None,
        })
    csc = json.loads((RAW / "csc_india.json").read_text())
    csc_states = []
    for s in csc["states"]:
        csc_states.append({"code": s["iso2"], "name": s["name"], "type": s.get("type"),
                           "lat": float(s["latitude"]), "lon": float(s["longitude"]), "id": s["id"]})
        for c in s["cities"]:
            out.append({
                "name": c["name"], "lat": float(c["latitude"]), "lon": float(c["longitude"]),
                "population": None, "sources": {"csc": int(c["id"])}, "csc_state": s["iso2"],
            })
    return out, csc_states


def main() -> int:
    for f in ("dists11.geojson", "geonames_cities500.json", "csc_india.json"):
        if not (RAW / f).exists():
            print(f"Missing data/raw/{f}. Run: python data/scripts/fetch_sources.py", file=sys.stderr)
            return 1
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "states").mkdir(exist_ok=True)
    (OUT / "boundaries").mkdir(exist_ok=True)

    districts, excluded = load_districts()
    tree = STRtree([d["geom"] for d in districts])
    places, csc_states = load_places()

    # ---- validate states/UTs against the official list -----------------------
    csc_codes = {s["code"] for s in csc_states}
    issues: list[str] = []
    if csc_codes != set(STATES):
        issues.append(f"CSC state codes differ from official list: {sorted(csc_codes ^ set(STATES))}")
    poly_codes = {d["state_code"] for d in districts}
    missing_poly = sorted(set(STATES) - poly_codes)
    if missing_poly:
        issues.append(f"No district polygons for: {missing_poly}")

    # ---- assign places to districts ------------------------------------------
    stats = Counter()
    assigned: list[dict] = []
    unassigned: list[dict] = []
    state_mismatch: list[dict] = []
    for p in places:
        pt = Point(p["lon"], p["lat"])
        idx = [i for i in tree.query(pt, predicate="intersects")]
        method = "contains"
        if not idx:
            near = int(tree.nearest(pt))
            d = districts[near]
            # distance in km from the point to the polygon boundary (approximate, degrees→km)
            dist_deg = d["geom"].distance(pt)
            dist_km = dist_deg * 111.32 * max(math.cos(math.radians(p["lat"])), 0.3)
            if dist_km <= SNAP_KM:
                idx, method = [near], "nearest"
                p["snap_km"] = round(dist_km, 2)
            else:
                stats["unassigned"] += 1
                unassigned.append({"name": p["name"], "lat": p["lat"], "lon": p["lon"],
                                   "sources": p["sources"], "distance_km": round(dist_km, 1)})
                continue
        d = districts[idx[0]]
        p["district_id"], p["state_code"], p["assignment"] = d["id"], d["state_code"], method
        stats[method] += 1
        if p["csc_state"] and p["csc_state"] != d["state_code"]:
            state_mismatch.append({"name": p["name"], "csc_state": p["csc_state"],
                                   "polygon_state": d["state_code"], "district": d["name"],
                                   "sources": p["sources"]})
        assigned.append(p)

    # ---- merge duplicates across sources -------------------------------------
    by_key: dict[tuple, list[dict]] = defaultdict(list)
    for p in assigned:
        by_key[(p["district_id"], norm(p["name"]))].append(p)
    merged: list[dict] = []
    merges = 0
    for group in by_key.values():
        clusters: list[dict] = []
        for p in sorted(group, key=lambda x: ("geonames" not in x["sources"], -(x["population"] or 0))):
            hit = next((c for c in clusters if km(c["lat"], c["lon"], p["lat"], p["lon"]) <= MERGE_KM), None)
            if hit:
                for k, v in p["sources"].items():
                    hit["sources"].setdefault(k, v)
                hit["population"] = hit["population"] or p["population"]
                merges += 1
            else:
                clusters.append(p)
        merged.extend(clusters)

    # ---- assemble output -----------------------------------------------------
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lock = json.loads((RAW / "SOURCES.lock.json").read_text()) if (RAW / "SOURCES.lock.json").exists() else {}
    csc_by_code = {s["code"]: s for s in csc_states}
    states_index, all_state_polys = [], []
    search_index = []
    per_state_counts = {}
    for code, (name, typ, capital) in STATES.items():
        ds = [d for d in districts if d["state_code"] == code]
        ps = [p for p in merged if p["state_code"] == code]
        ps.sort(key=lambda p: (-(p["population"] or 0), p["name"]))
        d_counts = Counter(p["district_id"] for p in ps)
        state_geom = unary_union([d["geom"] for d in ds]) if ds else None
        minx, miny, maxx, maxy = state_geom.bounds if state_geom else (0, 0, 0, 0)
        c = csc_by_code.get(code)
        rep = state_geom.representative_point() if state_geom else None
        dist_out = []
        for d in sorted(ds, key=lambda x: x["name"]):
            b = d["geom"].bounds
            rp = d["geom"].representative_point()
            dist_out.append({
                "id": d["id"], "name": d["name"], "name_2011": d["name_2011"],
                "census_2011_code": d["census_2011_code"], "state_2011": d["state_2011"],
                "lat": rnd(rp.y), "lon": rnd(rp.x), "bbox": [rnd(x, 4) for x in b],
                "place_count": d_counts.get(d["id"], 0),
            })
        place_out = []
        for p in ps:
            pid = f"gn-{p['sources']['geonames']}" if "geonames" in p["sources"] else f"csc-{p['sources']['csc']}"
            rec = {"id": pid, "name": p["name"], "lat": rnd(p["lat"]), "lon": rnd(p["lon"]),
                   "district_id": p["district_id"], "population": p["population"],
                   "sources": p["sources"], "assignment": p["assignment"]}
            if capital and norm(p["name"]) == norm(capital.split(" ")[0]):
                rec["is_capital"] = True
            place_out.append(rec)
            search_index.append([pid, p["name"], code, p["district_id"], rec["lat"], rec["lon"], p["population"] or 0])
        state_rec = {
            "code": code, "name": name, "type": typ, "capital": capital,
            "lat": rnd(c["lat"]) if c else (rnd(rep.y) if rep else None),
            "lon": rnd(c["lon"]) if c else (rnd(rep.x) if rep else None),
            "bbox": [rnd(x, 4) for x in (minx, miny, maxx, maxy)],
            "district_count": len(ds), "place_count": len(ps),
            "source_ids": {"csc": c["id"] if c else None, "iso_3166_2": f"IN-{code}"},
        }
        states_index.append(state_rec)
        per_state_counts[code] = {"districts": len(ds), "places": len(ps)}
        (OUT / "states" / f"{code}.json").write_text(json.dumps(
            {"state": state_rec, "districts": dist_out, "places": place_out,
             "generated_at": generated_at}, ensure_ascii=False, separators=(",", ":")))
        # simplified district boundaries for map display
        fc = {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {"id": d["id"], "name": d["name"], "state_code": code},
             "geometry": mapping(d["geom"].simplify(SIMPLIFY_DISTRICT, preserve_topology=True))}
            for d in ds]}
        (OUT / "boundaries" / f"{code}.geojson").write_text(_compact(fc))
        if state_geom:
            all_state_polys.append({"type": "Feature", "properties": {"code": code, "name": name, "type": typ},
                                    "geometry": mapping(state_geom.simplify(SIMPLIFY_STATE, preserve_topology=True))})

    (OUT / "boundaries" / "india-states.geojson").write_text(
        _compact({"type": "FeatureCollection", "features": all_state_polys}))
    (OUT / "states.json").write_text(json.dumps(states_index, ensure_ascii=False, indent=1))
    (OUT / "search-index.json").write_text(json.dumps(
        {"fields": ["id", "name", "state", "district_id", "lat", "lon", "population"], "rows": search_index},
        ensure_ascii=False, separators=(",", ":")))

    n_states = sum(1 for s in states_index if s["type"] == "state")
    n_uts = sum(1 for s in states_index if s["type"] == "union_territory")
    if (n_states, n_uts) != (28, 8):
        issues.append(f"Expected 28 states and 8 UTs, found {n_states} and {n_uts}")
    empty = [s["code"] for s in states_index if s["place_count"] == 0]
    if empty:
        issues.append(f"States/UTs with no populated places: {empty}")

    validation = {
        "generated_at": generated_at,
        "ok": not issues,
        "issues": issues,
        "states": n_states, "union_territories": n_uts,
        "districts_total": len(districts),
        "places_input": len(places), "places_output": len(merged),
        "assignment": {"point_in_polygon": stats["contains"], "snapped_to_nearest": stats["nearest"],
                       "unassigned_dropped": stats["unassigned"], "cross_source_merges": merges},
        "csc_state_mismatches": len(state_mismatch),
        "per_state": per_state_counts,
        "excluded_polygons": excluded,
        "reorganisation_rules": [
            {"from": f"{k[0]}:{k[1]}", "to": v} for k, v in REORG.items()],
        "samples": {"state_mismatch": state_mismatch[:50], "unassigned": unassigned[:50]},
    }
    (OUT / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=1))

    manifest = {
        "dataset": "Locate U — India administrative & populated places",
        "version": generated_at[:10],
        "generated_at": generated_at,
        "coverage_note": (
            "District boundaries follow Census 2011 (641 polygons, reconciled to today's 28 states and 8 UTs). "
            "Districts created after 2011 are NOT represented separately; their places appear under the 2011 parent district. "
            "Populated places are GeoNames settlements with population >= 500 plus CSC cities — this is NOT every village in India."
        ),
        "sources": [
            {"id": "datameet-dists11", "name": "DataMeet India — Census 2011 districts", "license": "CC BY 4.0",
             "url": "https://github.com/datameet/maps", "attribution": "India boundaries by DataMeet India community (CC BY 4.0)",
             "retrieved_at": lock.get("dists11.geojson", {}).get("retrieved_at"),
             "sha256": lock.get("dists11.geojson", {}).get("sha256")},
            {"id": "geonames", "name": "GeoNames cities500 (via geonamescache 3.0.2)", "license": "CC BY 4.0",
             "url": "https://www.geonames.org/", "attribution": "GeoNames (geonames.org), CC BY 4.0",
             "retrieved_at": lock.get("geonames_cities500.json", {}).get("retrieved_at"),
             "sha256": lock.get("geonames_cities500.json", {}).get("sha256"),
             "data_snapshot": "2020-02 (geonamescache 3.0.2 release)"},
            {"id": "csc", "name": "countries-states-cities-database (dr5hn)", "license": "ODbL 1.0",
             "url": "https://github.com/dr5hn/countries-states-cities-database",
             "attribution": "© dr5hn/countries-states-cities-database contributors, ODbL 1.0",
             "retrieved_at": lock.get("csc_india.json", {}).get("retrieved_at"),
             "sha256": lock.get("csc_india.json", {}).get("sha256")},
        ],
        "counts": {"states": n_states, "union_territories": n_uts, "districts": len(districts), "places": len(merged)},
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print(json.dumps({k: validation[k] for k in ("ok", "issues", "states", "union_territories", "districts_total",
                                                  "places_input", "places_output", "assignment", "csc_state_mismatches")}, indent=1))
    return 0 if not issues else 2


def _compact(obj) -> str:
    def r(o):
        if isinstance(o, float):
            return round(o, 4)
        if isinstance(o, (list, tuple)):
            return [r(x) for x in o]
        if isinstance(o, dict):
            return {k: r(v) for k, v in o.items()}
        return o
    return json.dumps(r(obj), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    sys.exit(main())
