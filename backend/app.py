import os

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text

from config import Config
from extensions import db, mail
from oauth_config import configure_oauth
from routes import advanced_bp, auth_bp, oauth_bp, password_reset_bp, scan_bp, settings_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={
            r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]},
            r"/auth/*": {"origins": app.config["FRONTEND_ORIGIN"]},
        },
        supports_credentials=True,
    )

    db.init_app(app)
    mail.init_app(app)
    configure_oauth(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(password_reset_bp)
    app.register_blueprint(scan_bp)
    app.register_blueprint(advanced_bp)
    app.register_blueprint(settings_bp)

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"message": "Endpoint not found"}), 404

    with app.app_context():
        db.create_all()
        _ensure_user_oauth_columns()
        _ensure_user_settings_columns()

    return app


def _ensure_user_oauth_columns():
    """Add OAuth columns when running against an older local SQLite database."""
    if not db.engine.url.get_backend_name().startswith("sqlite"):
        return

    existing_columns = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(user)")).fetchall()
    }
    new_columns = {
        "avatar_url": "VARCHAR(500)",
        "auth_provider": "VARCHAR(80) DEFAULT 'local'",
        "provider_user_id": "VARCHAR(255)",
    }

    for column_name, column_type in new_columns.items():
        if column_name not in existing_columns:
            db.session.execute(
                text(f"ALTER TABLE user ADD COLUMN {column_name} {column_type}")
            )
    db.session.commit()


def _ensure_user_settings_columns():
    """Add settings columns when running against an older local SQLite database."""
    if not db.engine.url.get_backend_name().startswith("sqlite"):
        return

    existing_columns = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(user_settings)")).fetchall()
    }
    if not existing_columns:
        return

    new_columns = {
        "workspace_name": "VARCHAR(160) DEFAULT 'DependGuard Workspace'",
        "default_scan_depth": "VARCHAR(40) DEFAULT 'standard'",
        "preferred_ecosystem": "VARCHAR(80) DEFAULT 'multi-language'",
        "auto_scan_uploads": "BOOLEAN DEFAULT 1",
        "remember_last_settings": "BOOLEAN DEFAULT 1",
        "email_alerts": "BOOLEAN DEFAULT 1",
        "weekly_security_reports": "BOOLEAN DEFAULT 0",
        "real_time_dashboard_alerts": "BOOLEAN DEFAULT 1",
        "critical_vulnerability_alerts": "BOOLEAN DEFAULT 1",
        "scan_completion_notifications": "BOOLEAN DEFAULT 1",
        "email_frequency": "VARCHAR(40) DEFAULT 'instant'",
        "live_cve_monitoring": "BOOLEAN DEFAULT 1",
        "strict_risk_scoring": "BOOLEAN DEFAULT 0",
        "include_dev_dependencies": "BOOLEAN DEFAULT 1",
        "typosquatting_detection": "BOOLEAN DEFAULT 1",
        "abandoned_package_detection": "BOOLEAN DEFAULT 1",
        "license_compliance_enforcement": "BOOLEAN DEFAULT 0",
        "auto_fix_vulnerable_packages": "BOOLEAN DEFAULT 0",
        "supply_chain_analysis": "BOOLEAN DEFAULT 1",
        "vulnerability_threshold": "VARCHAR(40) DEFAULT 'medium'",
        "ai_vulnerability_explanations": "BOOLEAN DEFAULT 1",
        "ai_remediation_suggestions": "BOOLEAN DEFAULT 1",
        "beginner_cybersecurity_mode": "BOOLEAN DEFAULT 1",
        "explain_risks_simple_language": "BOOLEAN DEFAULT 1",
        "auto_generated_fix_summaries": "BOOLEAN DEFAULT 1",
        "theme": "VARCHAR(40) DEFAULT 'dark'",
        "dashboard_density": "VARCHAR(40) DEFAULT 'comfortable'",
        "dashboard_animations": "BOOLEAN DEFAULT 1",
        "glassmorphism_effects": "BOOLEAN DEFAULT 1",
        "accent_color": "VARCHAR(40) DEFAULT '#22d3ee'",
        "generate_sbom_automatically": "BOOLEAN DEFAULT 0",
        "repository_auto_scanning": "BOOLEAN DEFAULT 0",
        "cache_cve_results": "BOOLEAN DEFAULT 1",
        "developer_debug_mode": "BOOLEAN DEFAULT 0",
        "integrations": "JSON",
    }

    for column_name, column_type in new_columns.items():
        if column_name not in existing_columns:
            db.session.execute(
                text(f"ALTER TABLE user_settings ADD COLUMN {column_name} {column_type}")
            )
    db.session.commit()


app = create_app()


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(host=host, port=port, debug=debug)
