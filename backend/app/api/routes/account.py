"""Accounts, Phone/Email Authentication, SMS/Email OTP Verification, Profile Management, and Saved Locations Sync."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import SavedLocation, User
from app.db.session import get_db
from app.schemas import (
    LoginIn,
    OtpSendIn,
    OtpSendOut,
    OtpVerifyIn,
    PasswordResetIn,
    ProfileUpdateIn,
    RegisterIn,
    SavedIn,
    SavedOut,
    SyncIn,
    TokenOut,
    UserOut,
    normalize_phone,
)
from app.services.sms import create_and_send_otp, verify_otp_code

auth = APIRouter(prefix="/auth", tags=["auth & profile"])
saved = APIRouter(prefix="/saved", tags=["saved locations"])

MAX_SAVED = 1000


def _find_user_by_identifier(db: Session, identifier: str, country_code: str = "+91") -> User | None:
    ident = identifier.strip()
    if not ident:
        return None
    if "@" in ident:
        return db.execute(select(User).where(User.email == ident.lower())).scalar_one_or_none()
    norm_phone = normalize_phone(country_code, ident)
    return db.execute(
        select(User).where(or_(User.phone_number == norm_phone, User.phone_number == ident))
    ).scalar_one_or_none()


@auth.post("/otp/send", response_model=OtpSendOut)
def send_otp(body: OtpSendIn, db: Session = Depends(get_db)):
    email_target = body.email.lower().strip() if body.email else None
    phone_target = body.phone_number.strip() if body.phone_number else None

    primary = email_target or phone_target or ""
    secondary = phone_target if (email_target and phone_target) else None

    res = create_and_send_otp(db, primary, body.purpose, secondary_target=secondary)
    return OtpSendOut(**res)


@auth.post("/otp/verify", response_model=TokenOut)
def verify_otp_endpoint(body: OtpVerifyIn, db: Session = Depends(get_db)):
    email_target = body.email.lower().strip() if body.email else None
    phone_target = body.phone_number.strip() if body.phone_number else None

    verified = False
    if email_target:
        try:
            verify_otp_code(db, email_target, body.otp_code, body.purpose, consume=True)
            verified = True
        except HTTPException:
            if not phone_target:
                raise
    if not verified and phone_target:
        verify_otp_code(db, phone_target, body.otp_code, body.purpose, consume=True)

    user = None
    if email_target:
        user = _find_user_by_identifier(db, email_target, body.country_code)
    if not user and phone_target:
        user = _find_user_by_identifier(db, phone_target, body.country_code)

    if not user:
        display = (body.display_name or (email_target.split("@")[0] if email_target else "Traveler")).strip()
        user = User(
            email=email_target,
            phone_number=phone_target,
            country_code=body.country_code or "+91",
            phone_verified=bool(phone_target),
            display_name=display,
            password_hash=hash_password(f"otp-auth-{email_target or phone_target}"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        changed = False
        if email_target and not user.email:
            user.email = email_target
            changed = True
        if phone_target and not user.phone_number:
            user.phone_number = phone_target
            user.phone_verified = True
            changed = True
        elif phone_target and user.phone_number == phone_target:
            user.phone_verified = True
            changed = True
        if body.display_name and body.display_name.strip():
            user.display_name = body.display_name.strip()
            changed = True
        if changed:
            db.commit()
            db.refresh(user)

    token, exp = create_access_token(user.id)
    return TokenOut(access_token=token, expires_in=exp, user=UserOut.model_validate(user))


@auth.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower() if body.email else None
    phone = body.phone_number

    if email and db.execute(select(User).where(User.email == email)).scalar_one_or_none():
        raise HTTPException(409, "An account with this email already exists")
    if phone and db.execute(select(User).where(User.phone_number == phone)).scalar_one_or_none():
        raise HTTPException(409, "An account with this phone number already exists")

    phone_verified = False
    if body.otp_code:
        if email:
            try:
                verify_otp_code(db, email, body.otp_code, "register", consume=True)
                phone_verified = bool(phone)
            except HTTPException:
                if phone:
                    verify_otp_code(db, phone, body.otp_code, "register", consume=True)
                    phone_verified = True
                else:
                    raise
        elif phone:
            verify_otp_code(db, phone, body.otp_code, "register", consume=True)
            phone_verified = True

    user = User(
        email=email,
        phone_number=phone,
        country_code=body.country_code or "+91",
        phone_verified=phone_verified,
        display_name=body.display_name.strip(),
        password_hash=hash_password(body.password),
        country=body.country or "India",
        state=body.state,
        home_city=body.home_city,
        food_preference=body.food_preference or "Vegetarian",
    )
    db.add(user)
    db.commit()
    token, exp = create_access_token(user.id)
    return TokenOut(access_token=token, expires_in=exp, user=UserOut.model_validate(user))


@auth.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    raw_ident = body.identifier or body.email or body.phone_number or ""
    user = _find_user_by_identifier(db, raw_ident, body.country_code)

    if not user:
        raise HTTPException(401, "Incorrect email/phone or credentials")

    if body.otp_code:
        target = user.phone_number if (body.phone_number or not ("@" in raw_ident)) else (user.email or raw_ident.lower())
        verify_otp_code(db, target or raw_ident, body.otp_code, "login", consume=True)
        if user.phone_number == target:
            user.phone_verified = True
            db.commit()
    elif body.password:
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(401, "Incorrect email/phone or password")
    else:
        raise HTTPException(422, "Provide either password or OTP code")

    token, exp = create_access_token(user.id)
    return TokenOut(access_token=token, expires_in=exp, user=UserOut.model_validate(user))


@auth.post("/password/reset", response_model=TokenOut)
def reset_password(body: PasswordResetIn, db: Session = Depends(get_db)):
    user = _find_user_by_identifier(db, body.identifier, body.country_code)
    if not user:
        raise HTTPException(404, "No account found matching that email or phone number")
    target = user.phone_number if not ("@" in body.identifier) else (user.email or body.identifier.lower())
    verify_otp_code(db, target or body.identifier, body.otp_code, "reset_password", consume=True)

    user.password_hash = hash_password(body.new_password)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    token, exp = create_access_token(user.id)
    return TokenOut(access_token=token, expires_in=exp, user=UserOut.model_validate(user))


@auth.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@auth.put("/me", response_model=UserOut)
def update_profile(body: ProfileUpdateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.email is not None:
        new_email = body.email.lower().strip()
        if new_email != user.email:
            existing = db.execute(select(User).where(User.email == new_email, User.id != user.id)).scalar_one_or_none()
            if existing:
                raise HTTPException(409, "Another account is already using this email address")
            user.email = new_email

    if body.phone_number is not None:
        new_phone = body.phone_number.strip() if body.phone_number else None
        if new_phone and new_phone != user.phone_number:
            existing_p = db.execute(
                select(User).where(User.phone_number == new_phone, User.id != user.id)
            ).scalar_one_or_none()
            if existing_p:
                raise HTTPException(409, "Another account is already using this phone number")
            user.phone_number = new_phone
        elif body.phone_number == "":
            user.phone_number = None

    if body.country_code is not None:
        user.country_code = body.country_code.strip() or "+91"
    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url or None
    if body.date_of_birth is not None:
        user.date_of_birth = body.date_of_birth or None
    if body.gender is not None:
        user.gender = body.gender or None
    if body.country is not None:
        user.country = body.country or "India"
    if body.state is not None:
        user.state = body.state or None
    if body.home_city is not None:
        user.home_city = body.home_city or None
    if body.food_preference is not None:
        user.food_preference = body.food_preference or "Vegetarian"

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@auth.delete("/me", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()
    return Response(status_code=204)


@saved.get("", response_model=list[SavedOut])
def list_saved(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return (
        db.execute(
            select(SavedLocation).where(SavedLocation.user_id == user.id).order_by(SavedLocation.updated_at.desc())
        )
        .scalars()
        .all()
    )


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
    if not row or row.user_id != user.id:
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
