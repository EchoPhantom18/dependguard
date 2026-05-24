import json
from datetime import datetime

from flask import Blueprint, Response, g, jsonify, request

from auth import token_required
from extensions import db
from models import OsvCache, Scan, UserSettings


settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


@settings_bp.get("")
@token_required
def get_settings():
    settings = _ensure_settings()
    return jsonify(settings.to_dict())


@settings_bp.put("")
@token_required
def update_settings():
    settings = _ensure_settings()
    data = request.get_json(silent=True) or {}

    if data.get("reset_to_defaults"):
        defaults = UserSettings.defaults()
        for field, value in defaults.items():
            setattr(settings, field, value)
    else:
        for field in UserSettings.defaults():
            if field == "integrations":
                continue
            if field in data:
                setattr(settings, field, data[field])

        if "integrations" in data:
            settings.integrations = {
                **UserSettings.DEFAULT_INTEGRATIONS,
                **(settings.integrations or {}),
                **(data.get("integrations") or {}),
            }

    if data.get("workspace_name"):
        g.current_user.company = data["workspace_name"]

    db.session.commit()
    return jsonify(settings.to_dict())


@settings_bp.post("/actions/clear-cache")
@token_required
def clear_cache():
    deleted_count = OsvCache.query.delete()
    db.session.commit()
    return jsonify({"message": "CVE cache cleared", "cleared": deleted_count})


@settings_bp.get("/actions/export-logs")
@token_required
def export_logs():
    settings = _ensure_settings()
    scans = (
        Scan.query.filter_by(user_id=g.current_user.id)
        .order_by(Scan.created_at.desc())
        .limit(25)
        .all()
    )
    lines = [
        "DependGuard Settings Export",
        f"Generated: {datetime.utcnow().isoformat()}Z",
        f"User: {g.current_user.email}",
        "",
        "Settings:",
        json.dumps(settings.to_dict(), indent=2),
        "",
        "Recent scans:",
    ]
    for scan in scans:
        lines.append(
            f"- #{scan.id} {scan.manifest_name}: risk={scan.risk_score}, vulnerabilities={scan.vulnerability_count}"
        )
    return Response(
        "\n".join(lines),
        mimetype="text/plain",
        headers={"Content-Disposition": "attachment; filename=dependguard-settings-logs.txt"},
    )


@settings_bp.get("/actions/export-reports")
@token_required
def export_reports():
    scans = (
        Scan.query.filter_by(user_id=g.current_user.id)
        .order_by(Scan.created_at.desc())
        .all()
    )
    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "user": g.current_user.email,
        "reports": [scan.to_dict(include_manifest=True) for scan in scans],
    }
    return Response(
        json.dumps(payload, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": "attachment; filename=dependguard-reports-export.json"},
    )


def _ensure_settings():
    settings = g.current_user.settings
    if not settings:
        settings = UserSettings(user_id=g.current_user.id)
        db.session.add(settings)
        db.session.commit()
    return settings
