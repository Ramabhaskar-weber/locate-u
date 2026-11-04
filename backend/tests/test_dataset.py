"""Validates the committed processed India dataset itself (all 36 files)."""
from __future__ import annotations

import json

import pytest

from app.core.config import get_settings
from app.services.india import validate_state_file

DATA = get_settings().india_data_path
OFFICIAL = {
    "state": {"AP", "AR", "AS", "BR", "CT", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML",
              "MZ", "NL", "OR", "PB", "RJ", "SK", "TN", "TG", "TR", "UP", "UK", "WB"},
    "union_territory": {"AN", "CH", "DH", "DL", "JK", "LA", "LD", "PY"},
}


def _states():
    return json.loads((DATA / "states.json").read_text())


def test_all_28_states_and_8_uts():
    states = _states()
    assert len(OFFICIAL["state"]) == 28 and len(OFFICIAL["union_territory"]) == 8
    by_type = {"state": set(), "union_territory": set()}
    for s in states:
        by_type[s["type"]].add(s["code"])
    assert by_type == OFFICIAL


@pytest.mark.parametrize("code", sorted(OFFICIAL["state"] | OFFICIAL["union_territory"]))
def test_state_file_integrity(code):
    payload = json.loads((DATA / "states" / f"{code}.json").read_text())
    assert validate_state_file(payload) == []
    assert payload["districts"], f"{code} has no districts"
    assert payload["places"], f"{code} has no places"
    minx, miny, maxx, maxy = payload["state"]["bbox"]
    for p in payload["places"]:
        # every place lies inside (or within the snap tolerance of) its state's bounding box
        assert miny - 0.2 <= p["lat"] <= maxy + 0.2 and minx - 0.2 <= p["lon"] <= maxx + 0.2, p
        assert "geonames" in p["sources"] or "csc" in p["sources"]


def test_validation_report_and_manifest():
    v = json.loads((DATA / "validation.json").read_text())
    assert v["ok"] is True and v["states"] == 28 and v["union_territories"] == 8
    m = json.loads((DATA / "manifest.json").read_text())
    assert {s["license"] for s in m["sources"]} >= {"CC BY 4.0", "ODbL 1.0"}
    assert all(s["url"].startswith("https://") for s in m["sources"])


def test_reorganisation_rules_applied():
    tg = json.loads((DATA / "states" / "TG.json").read_text())
    assert {d["name"] for d in tg["districts"]} >= {"Hyderabad", "Warangal", "Rangareddy"}
    ap = json.loads((DATA / "states" / "AP.json").read_text())
    assert "Hyderabad" not in {d["name"] for d in ap["districts"]}
    dh = json.loads((DATA / "states" / "DH.json").read_text())
    assert {d["name"] for d in dh["districts"]} == {"Daman", "Diu", "Dadra & Nagar Haveli"}
