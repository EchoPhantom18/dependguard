from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request

from extensions import db
from models import User


def create_token(user):
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=current_app.config["TOKEN_EXPIRES_HOURS"]
    )
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": expires_at,
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


def token_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "", 1).strip()

        if not token:
            return jsonify({"message": "Missing authorization token"}), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=["HS256"],
            )
            user = db.session.get(User, int(payload["sub"]))
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Session expired. Please sign in again."}), 401
        except (jwt.InvalidTokenError, KeyError, ValueError):
            return jsonify({"message": "Invalid authorization token"}), 401

        if not user:
            return jsonify({"message": "User not found"}), 401

        g.current_user = user
        return view(*args, **kwargs)

    return wrapped
