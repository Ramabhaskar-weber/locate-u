from __future__ import annotations

import httpx
import respx

NOMINATIM_SEARCH = [{
    "place_id": 1, "licence": "Data © OpenStreetMap contributors, ODbL 1.0", "osm_type": "relation",
    "osm_id": 1942586, "lat": "28.6138954", "lon": "77.2090057", "category": "boundary", "type": "administrative",
    "importance": 0.8, "name": "New Delhi", "display_name": "New Delhi, Delhi, India",
    "address": {"city": "New Delhi", "state": "Delhi", "country": "India", "country_code": "in"},
    "boundingbox": ["28.4", "28.8", "76.9", "77.4"],
}]
NOMINATIM_REVERSE = {
    "osm_type": "way", "osm_id": 42, "lat": "17.385", "lon": "78.4867", "category": "highway",
    "type": "primary", "name": "Abids Road", "display_name": "Abids Road, Hyderabad, Telangana, India",
    "address": {"road": "Abids Road", "city": "Hyderabad", "state": "Telangana", "country": "India"},
}


# ---- system ---------------------------------------------------------------
def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["database"]["ok"]
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


def test_config_has_no_secrets(client):
    r = client.get("/api/v1/config")
    assert r.status_code == 200
    text = r.text.lower()
    for word in ("secret", "api_key", "password", "gemini"):
        assert word not in text
    layers = r.json()["map"]["layers"]
    assert layers[0]["id"] == "osm" and "openstreetmap" in layers[0]["attribution"].lower()
    assert r.json()["features"]["satellite"] is False


def test_cors_restricted(client):
    ok = client.options("/api/v1/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options("/api/v1/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in bad.headers


def test_unknown_api_route_404(client):
    r = client.get("/api/v1/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


# ---- geocoding --------------------------------------------------------------
@respx.mock
def test_search_normalises_and_caches(client):
    route = respx.get("https://nominatim.test/search").mock(return_value=httpx.Response(200, json=NOMINATIM_SEARCH))
    r = client.get("/api/v1/geocode/search", params={"q": "New   Delhi"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["cached"] is False and body["query"] == "New Delhi"
    res = body["results"][0]
    assert res["id"] == "osm:R1942586" and res["lat"] == 28.6138954
    assert res["bbox"] == [76.9, 28.4, 77.4, 28.8]
    assert "openstreetmap" in body["attribution"].lower()
    sent = route.calls[0].request
    assert "LocateU" in sent.headers["user-agent"]
    assert sent.url.params["format"] == "jsonv2"
    # Second identical query is served from cache — no new upstream call.
    r2 = client.get("/api/v1/geocode/search", params={"q": "new delhi"})
    assert r2.json()["cached"] is True
    assert route.call_count == 1


def test_search_validation(client):
    assert client.get("/api/v1/geocode/search", params={"q": "a"}).status_code == 422
    assert client.get("/api/v1/geocode/search", params={"q": "x" * 201}).status_code == 422
    r = client.get("/api/v1/geocode/search", params={"q": "delhi", "lang": "<script>"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


@respx.mock
def test_search_provider_down(client):
    respx.get("https://nominatim.test/search").mock(side_effect=httpx.ConnectError("boom"))
    r = client.get("/api/v1/geocode/search", params={"q": "unreachable town"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "provider_unreachable"


@respx.mock
def test_search_provider_rate_limited(client):
    respx.get("https://nominatim.test/search").mock(return_value=httpx.Response(429))
    r = client.get("/api/v1/geocode/search", params={"q": "busy town"})
    assert r.status_code == 503 and r.json()["error"]["code"] == "provider_rate_limited"


@respx.mock
def test_reverse_with_local_nearest(client):
    respx.get("https://nominatim.test/reverse").mock(return_value=httpx.Response(200, json=NOMINATIM_REVERSE))
    r = client.get("/api/v1/geocode/reverse", params={"lat": 17.385, "lon": 78.4867})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["result"]["name"] == "Abids Road"
    near = body["nearest_india_places"]
    assert near and near[0]["state"] == "Telangana"


@respx.mock
def test_reverse_falls_back_to_local_dataset(client):
    respx.get("https://nominatim.test/reverse").mock(side_effect=httpx.ConnectError("offline"))
    r = client.get("/api/v1/geocode/reverse", params={"lat": 15.4909, "lon": 73.8278})
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "local-fallback" and body["result"] is None
    assert body["nearest_india_places"][0]["state"] == "Goa"


def test_reverse_rejects_bad_coordinates(client):
    assert client.get("/api/v1/geocode/reverse", params={"lat": 91, "lon": 0}).status_code == 422
    assert client.get("/api/v1/geocode/reverse", params={"lat": 0, "lon": 181}).status_code == 422


# ---- India explorer -----------------------------------------------------------
def test_states_listing(client):
    r = client.get("/api/v1/india/states")
    assert r.status_code == 200
    codes = {s["code"] for s in r.json()}
    assert {"AP", "TG", "DL", "LA"} <= codes
    tg = next(s for s in r.json() if s["code"] == "TG")
    assert tg["type"] == "state" and tg["district_count"] == 10
    assert "max-age" in r.headers["cache-control"]


def test_state_detail_and_districts(client):
    r = client.get("/api/v1/india/la")
    assert r.status_code == 200
    names = {d["name"] for d in r.json()["districts"]}
    assert names == {"Leh", "Kargil"}  # reorganised from J&K (2019)
    assert client.get("/api/v1/india/ZZ").status_code == 404


def test_places_cascade_and_relationship_validation(client):
    ds = client.get("/api/v1/india/TG/districts").json()
    hyd = next(d for d in ds if d["name"] == "Hyderabad")
    r = client.get("/api/v1/india/TG/places", params={"district": hyd["id"]})
    assert r.status_code == 200
    page = r.json()
    assert page["total"] >= 1
    assert all(p["district_id"] == hyd["id"] and p["sources"] for p in page["items"])
    # A district from another state is rejected rather than silently returning nothing.
    ap_d = client.get("/api/v1/india/AP/districts").json()[0]["id"]
    bad = client.get("/api/v1/india/TG/places", params={"district": ap_d})
    assert bad.status_code == 422


def test_places_sorting_and_paging(client):
    r = client.get("/api/v1/india/AP/places", params={"limit": 5, "sort": "population"}).json()
    pops = [p["population"] or 0 for p in r["items"]]
    assert pops == sorted(pops, reverse=True) and len(r["items"]) == 5
    r2 = client.get("/api/v1/india/AP/places", params={"limit": 5, "offset": 5}).json()
    assert {p["id"] for p in r["items"]}.isdisjoint({p["id"] for p in r2["items"]})


def test_india_search_ranks_exact_first(client):
    r = client.get("/api/v1/india/search", params={"q": "Panaji"}).json()
    assert r["places"] and r["places"][0]["name"].lower().startswith("panaji")
    r2 = client.get("/api/v1/india/search", params={"q": "hyder", "state": "TG"}).json()
    assert all(p["state_code"] == "TG" for p in r2["places"])


def test_place_detail(client):
    pid = client.get("/api/v1/india/search", params={"q": "Vijayawada"}).json()["places"][0]["id"]
    r = client.get(f"/api/v1/india/places/{pid}")
    assert r.status_code == 200
    body = r.json()
    assert body["state"]["code"] == "AP" and body["district"]["state_code"] == "AP"
    assert all(n["place"]["id"] != pid for n in body["nearby"])
    assert client.get("/api/v1/india/places/gn-0").status_code == 404


def test_nearest_endpoint(client):
    r = client.get("/api/v1/india/nearest", params={"lat": 28.6139, "lon": 77.209, "limit": 3})
    assert r.status_code == 200 and r.json()[0]["state"] == "Delhi"
    far = client.get("/api/v1/india/nearest", params={"lat": 0, "lon": 0}).json()
    assert far == []


def test_boundaries(client):
    r = client.get("/api/v1/india/boundaries/TG")
    assert r.status_code == 200
    assert r.json()["type"] == "FeatureCollection" and len(r.json()["features"]) == 10
    assert client.get("/api/v1/india/boundaries/states").status_code == 200
    assert client.get("/api/v1/india/boundaries/..").status_code in (404, 422)


def test_coverage_reports_honestly(client):
    c = client.get("/api/v1/india/coverage").json()
    assert c["expected"] == {"states": 28, "union_territories": 8}
    assert c["last_import"]["validation"]["ok"] is True
    assert "NOT every village" in c["manifest"]["coverage_note"]


# ---- preview providers ----------------------------------------------------------
@respx.mock
def test_weather(client):
    respx.get("https://meteo.test/v1/forecast").mock(return_value=httpx.Response(200, json={
        "timezone": "Asia/Kolkata",
        "current": {"time": "2026-11-04T10:00", "temperature_2m": 29.1, "weather_code": 2, "is_day": 1},
        "daily": {"time": ["2026-11-04"], "weather_code": [61], "temperature_2m_max": [31], "temperature_2m_min": [22]},
    }))
    r = client.get("/api/v1/weather", params={"lat": 17.38, "lon": 78.48})
    assert r.status_code == 200
    d = r.json()["data"]
    assert d["current"]["summary"] == "Partly cloudy" and d["daily"][0]["summary"] == "Light rain"
    assert "Open-Meteo" in d["attribution"]


@respx.mock
def test_nearby_overpass(client):
    respx.post("https://overpass.test/api/interpreter").mock(return_value=httpx.Response(200, json={"elements": [
        {"type": "node", "id": 1, "lat": 17.39, "lon": 78.49, "tags": {"amenity": "hospital", "name": "Far"}},
        {"type": "way", "id": 2, "center": {"lat": 17.3851, "lon": 78.4868}, "tags": {"amenity": "clinic", "name": "Near"}},
        {"type": "node", "id": 3, "tags": {"amenity": "hospital"}},
    ]}))
    r = client.get("/api/v1/nearby", params={"lat": 17.385, "lon": 78.4867, "category": "hospital"})
    assert r.status_code == 200, r.text
    items = r.json()["data"]
    assert [i["name"] for i in items] == ["Near", "Far"]
    assert client.get("/api/v1/nearby", params={"lat": 1, "lon": 1, "category": "casino"}).status_code == 422


@respx.mock
def test_wiki_summary(client):
    respx.get(url__regex=r"https://en\.wikipedia\.test/api/rest_v1/page/summary/.*").mock(
        return_value=httpx.Response(200, json={"type": "standard", "title": "Hyderabad", "extract": "Capital of Telangana.",
                                               "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Hyderabad"}}}))
    r = client.get("/api/v1/wiki/summary", params={"title": "Hyderabad"})
    assert r.status_code == 200 and r.json()["data"]["extract"] == "Capital of Telangana."


def test_permissions_policy_allows_own_geolocation(client):
    # The SPA served from this origin must be able to request location; third parties may not.
    h = client.get("/api/v1/health").headers["permissions-policy"]
    assert "geolocation=(self)" in h and "camera=()" in h
