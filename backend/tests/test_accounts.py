from __future__ import annotations

import uuid

from app.core.security import hash_password, verify_password
from app.db.models import User


def _register(client, email=None, password="travel123!"):
    email = email or f"user-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/v1/auth/register", json={"email": email, "password": password, "display_name": "Asha"})
    assert r.status_code == 201, r.text
    return email, {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_password_hashing():
    h = hash_password("s3cret-pass")
    assert "s3cret-pass" not in h and h.startswith("scrypt$")
    assert verify_password("s3cret-pass", h)
    assert not verify_password("wrong", h)
    assert not verify_password("x", "garbage")


def test_register_login_and_me(client, db):
    email, hdr = _register(client)
    row = db.query(User).filter_by(email=email).one()
    assert row.password_hash != "travel123!"
    me = client.get("/api/v1/auth/me", headers=hdr)
    assert me.status_code == 200 and me.json()["email"] == email
    ok = client.post("/api/v1/auth/login", json={"email": email.upper(), "password": "travel123!"})
    assert ok.status_code == 200
    bad = client.post("/api/v1/auth/login", json={"email": email, "password": "nope"})
    assert bad.status_code == 401
    dup = client.post("/api/v1/auth/register", json={"email": email, "password": "travel123!", "display_name": "B"})
    assert dup.status_code == 409


def test_weak_password_and_bad_email(client):
    r = client.post("/api/v1/auth/register", json={"email": "a@example.com", "password": "12345678", "display_name": "x"})
    assert r.status_code == 422
    r = client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "abc12345", "display_name": "x"})
    assert r.status_code == 422


def test_auth_required(client):
    assert client.get("/api/v1/saved").status_code == 401
    assert client.get("/api/v1/saved", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_saved_crud_and_ownership(client):
    _, a = _register(client)
    _, b = _register(client)
    body = {"name": "Charminar", "lat": 17.3616, "lon": 78.4747, "tags": ["heritage", " "], "source": "search"}
    r = client.post("/api/v1/saved", json=body, headers=a)
    assert r.status_code == 201
    sid = r.json()["id"]
    assert r.json()["tags"] == ["heritage"]
    assert len(client.get("/api/v1/saved", headers=a).json()) == 1
    assert client.get("/api/v1/saved", headers=b).json() == []
    # user B cannot read, edit or delete user A's location
    assert client.put(f"/api/v1/saved/{sid}", json=body, headers=b).status_code == 404
    assert client.delete(f"/api/v1/saved/{sid}", headers=b).status_code == 404
    upd = client.put(f"/api/v1/saved/{sid}", json={**body, "note": "Visit at sunset"}, headers=a)
    assert upd.json()["note"] == "Visit at sunset"
    assert client.delete(f"/api/v1/saved/{sid}", headers=a).status_code == 204


def test_saved_validation(client):
    _, a = _register(client)
    assert client.post("/api/v1/saved", json={"name": "x", "lat": 100, "lon": 0}, headers=a).status_code == 422
    assert client.post("/api/v1/saved", json={"name": "", "lat": 1, "lon": 1}, headers=a).status_code == 422
    assert client.post("/api/v1/saved", json={"name": "x", "lat": 1, "lon": 1, "color": "red"}, headers=a).status_code == 422


def test_sync_upserts(client):
    _, a = _register(client)
    lid = str(uuid.uuid4())
    items = [{"id": lid, "name": "Goa beach", "lat": 15.5, "lon": 73.8}, {"name": "No id", "lat": 1, "lon": 2}]
    r = client.post("/api/v1/saved/sync", json={"items": items}, headers=a)
    assert r.status_code == 200 and len(r.json()) == 2
    items[0]["name"] = "Goa beach (renamed)"
    r = client.post("/api/v1/saved/sync", json={"items": items[:1]}, headers=a)
    assert {x["name"] for x in r.json()} == {"Goa beach (renamed)", "No id"}


def test_delete_account(client):
    _, a = _register(client)
    assert client.delete("/api/v1/auth/me", headers=a).status_code == 204
    assert client.get("/api/v1/auth/me", headers=a).status_code == 401
