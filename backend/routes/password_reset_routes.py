from datetime import datetime, timedelta
import secrets

from flask import Blueprint, current_app, jsonify, request
from flask_mail import Message

from extensions import db, mail
from models import PasswordResetToken, User


password_reset_bp = Blueprint("password_reset", __name__, url_prefix="/auth")
RESET_SENT_MESSAGE = "If an account exists, a reset link has been sent."


@password_reset_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if email:
        user = User.query.filter_by(email=email).first()
        if user:
            reset_token = _create_reset_token(user)
            reset_link = f"{current_app.config['FRONTEND_URL']}/reset-password/{reset_token.token}"
            _send_reset_email(user.email, reset_link)

    return jsonify({"message": RESET_SENT_MESSAGE})


@password_reset_bp.post("/reset-password/<token>")
def reset_password(token):
    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token).first()
    if not reset_token or not reset_token.is_valid():
        return jsonify({"message": "Reset link is invalid or has expired"}), 400

    user = reset_token.user
    user.set_password(password)
    user.auth_provider = user.auth_provider or "local"
    reset_token.used = True

    PasswordResetToken.query.filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used.is_(False),
        PasswordResetToken.id != reset_token.id,
    ).update({"used": True})

    db.session.commit()
    return jsonify({"message": "Password reset successful. You can now sign in."})


def _create_reset_token(user):
    PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})

    reset_token = PasswordResetToken(
        user_id=user.id,
        token=secrets.token_urlsafe(48),
        expires_at=datetime.utcnow()
        + timedelta(minutes=current_app.config["PASSWORD_RESET_TOKEN_MINUTES"]),
    )
    db.session.add(reset_token)
    db.session.commit()
    return reset_token


def _send_reset_email(email, reset_link):
    if not _mail_is_configured():
        current_app.logger.warning(
            "[PasswordReset] Mail credentials missing. Reset link for %s: %s",
            email,
            reset_link,
        )
        return

    try:
        message = Message(
            subject="Reset your DependGuard password",
            recipients=[email],
            body=(
                "We received a request to reset your DependGuard password.\n\n"
                f"Use this link within {current_app.config['PASSWORD_RESET_TOKEN_MINUTES']} minutes:\n"
                f"{reset_link}\n\n"
                "If you did not request this, you can ignore this email."
            ),
        )
        mail.send(message)
    except Exception:
        current_app.logger.exception("[PasswordReset] Failed to send reset email to %s", email)


def _mail_is_configured():
    if not current_app.config.get("SEND_EMAILS"):
        return False

    placeholder_values = {"", "your_email@gmail.com", "your_app_password"}
    username = (current_app.config.get("MAIL_USERNAME") or "").strip()
    password = (current_app.config.get("MAIL_PASSWORD") or "").strip()
    sender = (current_app.config.get("MAIL_DEFAULT_SENDER") or "").strip()

    return (
        username not in placeholder_values
        and password not in placeholder_values
        and sender not in placeholder_values
    )
