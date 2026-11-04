#!/usr/bin/env python3
"""Download the raw India source datasets used by Locate U.

Raw files are written to ``data/raw`` (git-ignored because they are large).
Every download is recorded in ``data/raw/SOURCES.lock.json`` with its URL,
size, SHA-256 and retrieval time so the processed output can be traced back
to an exact input.

Sources (see docs/DATA_SOURCES.md for full licence notes):

* DataMeet India — Census 2011 district boundaries (CC BY 4.0)
* GeoNames — populated places with population >= 500, via the
  ``geonamescache`` 3.0.2 package on PyPI (data CC BY 4.0, package MIT)
* countries-states-cities-database by dr5hn (ODbL 1.0) — states/UTs and
  cities of India

Usage::

    python data/scripts/fetch_sources.py            # download missing files
    python data/scripts/fetch_sources.py --force    # re-download everything
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "raw"
USER_AGENT = "LocateU-data-pipeline/1.0 (+https://github.com/chiranjeevi560)"

SOURCES = {
    "dists11.geojson": {
        "url": "https://raw.githubusercontent.com/datameet/maps/master/website/docs/data/geojson/dists11.geojson",
        "name": "DataMeet India — Census 2011 district boundaries",
        "license": "CC BY 4.0",
        "homepage": "https://github.com/datameet/maps",
    },
    "csc_india.json": {
        "url": "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries%2Bstates%2Bcities.json",
        "name": "countries-states-cities-database (India subset)",
        "license": "ODbL 1.0",
        "homepage": "https://github.com/dr5hn/countries-states-cities-database",
        "extract": "csc_india",
    },
    "geonames_cities500.json": {
        "url": "https://files.pythonhosted.org/packages/py3/g/geonamescache/geonamescache-3.0.2-py3-none-any.whl",
        "name": "GeoNames cities500 (via geonamescache 3.0.2)",
        "license": "CC BY 4.0 (GeoNames data); MIT (geonamescache package)",
        "homepage": "https://www.geonames.org/",
        "extract": "wheel:geonamescache/data/cities500.json",
    },
}


def _download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp:  # noqa: S310 - fixed https URLs
        return resp.read()


def _extract(spec: str | None, payload: bytes) -> bytes:
    if not spec:
        return payload
    if spec == "csc_india":
        countries = json.loads(payload)
        india = next(c for c in countries if c.get("iso2") == "IN")
        return json.dumps(india).encode()
    if spec.startswith("wheel:"):
        member = spec.split(":", 1)[1]
        with zipfile.ZipFile(io.BytesIO(payload)) as zf:
            return zf.read(member)
    raise ValueError(f"unknown extract spec {spec}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    lock_path = RAW / "SOURCES.lock.json"
    lock = json.loads(lock_path.read_text()) if lock_path.exists() else {}

    for filename, meta in SOURCES.items():
        target = RAW / filename
        if target.exists() and not args.force:
            print(f"✓ {filename} already present (use --force to refresh)")
            data = target.read_bytes()
        else:
            print(f"↓ {meta['name']} …")
            data = _extract(meta.get("extract"), _download(meta["url"]))
            target.write_bytes(data)
            lock[filename] = {
                **{k: v for k, v in meta.items() if k != "extract"},
                "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            }
        lock.setdefault(filename, {k: v for k, v in meta.items() if k != "extract"})
        lock[filename]["bytes"] = len(data)
        lock[filename]["sha256"] = hashlib.sha256(data).hexdigest()

    lock_path.write_text(json.dumps(lock, indent=2))
    print(f"Wrote {lock_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
