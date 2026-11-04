"""Optional accounts and cloud sync for saved locations.

Saved locations live on the device (IndexedDB) by default. They are only sent
to the server when the user signs in and turns on sync — personal location
data never leaves the device without that explicit action.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import SavedLocation, User
from app.db.session import get_db
from app.schemas import LoginIn, RegisterIn, SavedIn, SavedOut, SyncIn, TokenOut, UserOut

auth = APIRouter(prefix="/auth", tags=["auth"])
saved = APIRouter(prefix="/saved", tags=["saved locations"])

MAX_SAVED = 1000


@auth.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.execute(select(User).where(User.email == email)).scalar_one_or_none():
        raise HTTPException(409, "An account with this email already exists")
    user = User(email=email, display_name=body.display_name.strip(), password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    token, exp = create_access_token(user.id)
    return TokenOut(access_token=token, expires_in=exp, user=UserOut.model_validate(user))


@auth.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == body.email.lower())).scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    token, exp = create_access_token(user.id)
    return TokenOut(access_token=token, expires_in=exp, user=UserOut.model_validate(user))


@auth.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@auth.delete("/me", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()
    return Response(status_code=204)


@saved.get("", response_model=list[SavedOut])
def list_saved(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.execute(select(SavedLocation).where(SavedLocation.user_id == user.id)
                      .order_by(SavedLocation.updated_at.desc())).scalars().all()


def _apply(row: SavedLocation, body: SavedIn) -> None:
    for f in ("name", "lat", "lon", "address", "note", "tags", "collection", "color", "source", "source_ref"):
        setattr(row, f, getattr(body, f))


def _count(db: Session, user: User) -> int:
    return len(db.execute(select(SavedLocation.id).where(SavedLocation.user_id == user.id)).all())


@saved.post("", response_model=SavedOut, status_code=201)
def create_saved(body: SavedIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if _count(db, user) >= MAX_SAVED:
        raise HTTPException(422, f"Limit of {MAX_SAVED} saved locations reached")
    row = SavedLocation(user_id=user.id)
    if body.id:
        if db.get(SavedLocation, body.id):
            raise HTTPException(409, "A saved location with this id already exists")
        row.id = body.id
    _apply(row, body)
    db.add(row)
    db.commit()
    return row


def _owned(db: Session, user: User, sid: str) -> SavedLocation:
    row = db.get(SavedLocation, sid)
    if not row or row.user_id != user.id:  # ownership check: never reveal other users' rows
        raise HTTPException(404, "Saved location not found")
    return row


@saved.put("/{sid}", response_model=SavedOut)
def update_saved(sid: str, body: SavedIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = _owned(db, user, sid)
    _apply(row, body)
    db.commit()
    return row


@saved.delete("/{sid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved(sid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_owned(db, user, sid))
    db.commit()
    return Response(status_code=204)


@saved.post("/sync", response_model=list[SavedOut])
def sync(body: SyncIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Upsert the device's saved locations and return the merged server list."""
    for item in body.items:
        row = db.get(SavedLocation, item.id) if item.id else None
        if row and row.user_id != user.id:
            continue
        if row is None:
            if _count(db, user) >= MAX_SAVED:
                break
            row = SavedLocation(user_id=user.id)
            if item.id:
                row.id = item.id
            db.add(row)
        _apply(row, item)
        db.flush()
    db.commit()
    return list_saved(user, db)
