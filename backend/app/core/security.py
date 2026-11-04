"""Password hashing (scrypt, stdlib) and JWT access tokens."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import get_settings

_SCRYPT = {"n": 2**14, "r": 8, "p": 1, "dklen": 32}


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return "scrypt$%d$%d$%d$%s$%s" % (
        _SCRYPT["n"], _SCRYPT["r"], _SCRYPT["p"],
        base64.b64encode(salt).decode(), base64.b64encode(dk).decode(),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt_b64, dk_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(dk_b64)
        dk = hashlib.scrypt(password.encode(), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(dk, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str) -> tuple[str, int]:
    s = get_settings()
    expires = timedelta(minutes=s.ACCESS_TOKEN_MINUTES)
    now = datetime.now(timezone.utc)
    token = jwt.encode({"sub": subject, "iat": now, "exp": now + expires, "typ": "access"},
                       s.SECRET_KEY, algorithm="HS256")
    return token, int(expires.total_seconds())


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("typ") != "access":
        return None
    return payload.get("sub")
