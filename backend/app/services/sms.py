"""SMS & Email OTP Verification Service."""
from __future__ import annotations

import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx
from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.db.models import OtpVerification

log = logging.getLogger("locate_u.sms")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def generate_otp_code() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"


def dispatch_email_otp(target_email: str, otp_code: str, purpose: str) -> tuple[str, str | None]:
    s = get_settings()
    if not (s.SMTP_USER and s.SMTP_PASSWORD):
        log.info("[EMAIL OUTBOX] To=%s | Purpose=%s | OTP=%s", target_email, purpose, otp_code)
        preview = otp_code if s.APP_ENV != "production" else None
        return "console-email-outbox", preview

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Locate U — Your {purpose.replace('_', ' ').title()} Verification Code: {otp_code}"
        msg["From"] = f"{s.SMTP_FROM_NAME} <{s.SMTP_USER}>"
        msg["To"] = target_email

        plain_text = f"Your Locate U verification code is: {otp_code}\n\nValid for {s.OTP_EXPIRY_MINUTES} minutes. Please do not share this code."
        html_text = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 24px;">Locate U</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Smart India Travel Companion</p>
          </div>
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <p style="font-size: 14px; color: #475569; margin: 0 0 12px 0;">Your 6-digit verification code is:</p>
            <div style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b; padding: 8px 16px; background-color: #e0e7ff; border-radius: 8px; display: inline-block;">
              {otp_code}
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 12px; margin-bottom: 0;">Valid for {s.OTP_EXPIRY_MINUTES} minutes. Never share this OTP.</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
        """
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_text, "html"))

        if s.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(s.SMTP_HOST, s.SMTP_PORT, timeout=10.0) as server:
                server.login(s.SMTP_USER, s.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=10.0) as server:
                server.starttls()
                server.login(s.SMTP_USER, s.SMTP_PASSWORD)
                server.send_message(msg)

        log.info("Sent OTP email to %s via %s", target_email, s.SMTP_HOST)
        return "gmail-smtp", None
    except Exception as exc:
        log.error("SMTP email dispatch failed: %s", exc)
        return "console-email-outbox", otp_code


def dispatch_sms(target: str, otp_code: str, purpose: str) -> tuple[str, str | None]:
    if "@" in target:
        return dispatch_email_otp(target, otp_code, purpose)

    s = get_settings()
    msg_body = f"Your Locate U verification code for {purpose} is {otp_code}. Valid for {s.OTP_EXPIRY_MINUTES} minutes. Do not share this code."

    if s.SMS_PROVIDER == "fast2sms" or s.FAST2SMS_API_KEY:
        try:
            clean_num = target.replace("+91", "").lstrip("+")
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    "https://www.fast2sms.com/dev/bulkV2",
                    headers={"authorization": s.FAST2SMS_API_KEY, "Content-Type": "application/json"},
                    json={"route": "otp", "variables_values": otp_code, "numbers": clean_num},
                )
                if resp.status_code >= 400:
                    log.error("Fast2SMS error (%s): %s", resp.status_code, resp.text)
                    raise HTTPException(502, "Fast2SMS gateway rejected the request.")
            return "fast2sms", None
        except Exception as exc:
            log.error("Fast2SMS dispatch failed: %s", exc)

    log.info("[SMS OUTBOX] To=%s | Purpose=%s | OTP=%s", target, purpose, otp_code)
    preview = otp_code if s.APP_ENV != "production" else None
    return "console-outbox", preview


def create_and_send_otp(db: Session, target: str, purpose: str) -> dict:
    s = get_settings()
    now = _utcnow()

    recent = (
        db.execute(
            select(OtpVerification)
            .where(OtpVerification.target == target, OtpVerification.purpose == purpose)
            .order_by(OtpVerification.created_at.desc())
        )
        .scalars()
        .first()
    )
    if recent is not None:
        created = _ensure_aware(recent.created_at)
        elapsed = (now - created).total_seconds()
        if elapsed < s.OTP_COOLDOWN_SECONDS and s.APP_ENV != "test":
            remaining = int(s.OTP_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(429, f"Please wait {remaining} seconds before requesting another OTP.")

    db.execute(delete(OtpVerification).where(OtpVerification.target == target, OtpVerification.expires_at < now))

    otp_code = generate_otp_code()
    expires_at = now + timedelta(minutes=s.OTP_EXPIRY_MINUTES)
    row = OtpVerification(
        target=target,
        purpose=purpose,
        otp_hash=hash_password(otp_code),
        attempts=0,
        verified=False,
        created_at=now,
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()

    provider, preview = dispatch_sms(target, otp_code, purpose)
    return {
        "target": target,
        "purpose": purpose,
        "expires_in_seconds": s.OTP_EXPIRY_MINUTES * 60,
        "cooldown_seconds": s.OTP_COOLDOWN_SECONDS,
        "provider": provider,
        "message": (
            f"OTP sent to {target} via {provider}."
            if provider not in ("console-outbox", "console-email-outbox")
            else f"OTP generated for {target}."
        ),
        "dev_otp_preview": preview,
    }


def verify_otp_code(db: Session, target: str, otp_code: str, purpose: str, consume: bool = True) -> bool:
    s = get_settings()
    now = _utcnow()
    row = (
        db.execute(
            select(OtpVerification)
            .where(
                OtpVerification.target == target,
                OtpVerification.purpose == purpose,
                OtpVerification.verified == False,
            )
            .order_by(OtpVerification.created_at.desc())
        )
        .scalars()
        .first()
    )
    if row is None:
        raise HTTPException(400, "No active OTP found. Please request a new OTP.")

    if _ensure_aware(row.expires_at) < now:
        raise HTTPException(400, "This OTP has expired. Please request a new code.")

    if row.attempts >= s.OTP_MAX_ATTEMPTS:
        raise HTTPException(429, "Maximum OTP verification attempts exceeded.")

    row.attempts += 1
    if not verify_password(otp_code.strip(), row.otp_hash):
        db.commit()
        remaining = max(0, s.OTP_MAX_ATTEMPTS - row.attempts)
        raise HTTPException(401, f"Invalid OTP code. {remaining} attempt(s) remaining.")

    if consume:
        row.verified = True
    db.commit()
    return True
