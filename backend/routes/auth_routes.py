from flask import Blueprint, g, jsonify, request

from auth import create_token, token_required
from extensions import db
from models import User, UserSettings


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    company = (data.get("company") or "DependGuard Workspace").strip()

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "An account already exists for this email"}), 409

    user = User(name=name, email=email, company=company)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    db.session.add(UserSettings(user_id=user.id))
    db.session.commit()

    token = create_token(user)
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = create_token(user)
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.get("/me")
@token_required
def me():
    return jsonify({"user": g.current_user.to_dict()})
