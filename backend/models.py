from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    auth_provider = db.Column(db.String(80), default="local")
    provider_user_id = db.Column(db.String(255), nullable=True, index=True)
    company = db.Column(db.String(160), default="DependGuard Workspace")
    role = db.Column(db.String(80), default="Security Analyst")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scans = db.relationship("Scan", backref="user", lazy=True, cascade="all, delete")
    settings = db.relationship(
        "UserSettings",
        backref="user",
        lazy=True,
        uselist=False,
        cascade="all, delete",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "company": self.company,
            "role": self.role,
            "avatar_url": self.avatar_url,
            "auth_provider": self.auth_provider,
            "provider_user_id": self.provider_user_id,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class Scan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    manifest_name = db.Column(db.String(255), nullable=False)
    manifest_type = db.Column(db.String(80), nullable=False)
    original_manifest = db.Column(db.Text, nullable=False)
    safe_manifest = db.Column(db.Text, nullable=True)
    total_dependencies = db.Column(db.Integer, default=0)
    vulnerability_count = db.Column(db.Integer, default=0)
    risk_score = db.Column(db.Integer, default=0)
    severity_counts = db.Column(db.JSON, default=dict)
    findings = db.Column(db.JSON, default=list)
    config = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self, include_manifest=False):
        data = {
            "id": self.id,
            "manifest_name": self.manifest_name,
            "manifest_type": self.manifest_type,
            "total_dependencies": self.total_dependencies,
            "vulnerability_count": self.vulnerability_count,
            "risk_score": self.risk_score,
            "security_score": max(0, 100 - (self.risk_score or 0)),
            "severity_counts": self.severity_counts or {},
            "findings": self.findings or [],
            "config": self.config or {},
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
        if include_manifest:
            data["original_manifest"] = self.original_manifest
            data["safe_manifest"] = self.safe_manifest
        return data


class OsvCache(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    package_name = db.Column(db.String(255), nullable=False, index=True)
    version = db.Column(db.String(120), nullable=False, index=True)
    ecosystem = db.Column(db.String(80), nullable=False, index=True)
    api_response = db.Column(db.JSON, nullable=False)
    scanned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        db.UniqueConstraint(
            "package_name",
            "version",
            "ecosystem",
            name="uq_osv_cache_package_version_ecosystem",
        ),
    )

    def is_fresh(self, max_age):
        return datetime.utcnow() - self.scanned_at <= max_age


class RepositoryScan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    repo_url = db.Column(db.String(500), nullable=False)
    repo_owner = db.Column(db.String(160), nullable=False)
    repo_name = db.Column(db.String(160), nullable=False)
    branch = db.Column(db.String(160), nullable=True)
    manifests = db.Column(db.JSON, default=list)
    scan_ids = db.Column(db.JSON, default=list)
    status = db.Column(db.String(40), default="completed")
    message = db.Column(db.String(500), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "repo_url": self.repo_url,
            "repo_owner": self.repo_owner,
            "repo_name": self.repo_name,
            "branch": self.branch,
            "manifests": self.manifests or [],
            "scan_ids": self.scan_ids or [],
            "status": self.status,
            "message": self.message,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class LicenseFinding(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    scan_id = db.Column(db.Integer, db.ForeignKey("scan.id"), nullable=True, index=True)
    package_name = db.Column(db.String(255), nullable=False, index=True)
    version = db.Column(db.String(120), nullable=True)
    license_name = db.Column(db.String(120), nullable=False)
    risk_level = db.Column(db.String(40), nullable=False)
    reason = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "scan_id": self.scan_id,
            "package_name": self.package_name,
            "version": self.version,
            "license": self.license_name,
            "risk_level": self.risk_level,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class SupplyChainFinding(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    scan_id = db.Column(db.Integer, db.ForeignKey("scan.id"), nullable=True, index=True)
    package_name = db.Column(db.String(255), nullable=False, index=True)
    version = db.Column(db.String(120), nullable=True)
    score = db.Column(db.Integer, nullable=False)
    risk_level = db.Column(db.String(40), nullable=False)
    reasons = db.Column(db.JSON, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "scan_id": self.scan_id,
            "package_name": self.package_name,
            "version": self.version,
            "score": self.score,
            "risk_level": self.risk_level,
            "reasons": self.reasons or [],
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class GeneratedReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    scan_id = db.Column(db.Integer, db.ForeignKey("scan.id"), nullable=False, index=True)
    report_type = db.Column(db.String(40), nullable=False, default="pdf")
    filename = db.Column(db.String(255), nullable=False)
    content_preview = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "scan_id": self.scan_id,
            "report_type": self.report_type,
            "filename": self.filename,
            "content_preview": self.content_preview,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class CIConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    provider = db.Column(db.String(40), nullable=False)
    project_name = db.Column(db.String(160), default="DependGuard")
    yaml_content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "provider": self.provider,
            "project_name": self.project_name,
            "yaml_content": self.yaml_content,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("password_reset_tokens", lazy=True))

    def is_expired(self):
        return datetime.utcnow() >= self.expires_at

    def is_valid(self):
        return not self.used and not self.is_expired()


class UserSettings(db.Model):
    DEFAULT_INTEGRATIONS = {
        "github": {"connected": False, "status": "not_connected"},
        "gitlab": {"connected": False, "status": "not_connected"},
        "slack": {"connected": False, "status": "not_connected"},
        "discord": {"connected": False, "status": "not_connected"},
        "webhooks": {"connected": False, "status": "not_connected"},
    }

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, unique=True)

    workspace_name = db.Column(db.String(160), default="DependGuard Workspace")
    default_scan_depth = db.Column(db.String(40), default="standard")
    preferred_ecosystem = db.Column(db.String(80), default="multi-language")
    auto_scan_uploads = db.Column(db.Boolean, default=True)
    remember_last_settings = db.Column(db.Boolean, default=True)

    notifications_enabled = db.Column(db.Boolean, default=True)
    email_alerts = db.Column(db.Boolean, default=True)
    weekly_security_reports = db.Column(db.Boolean, default=False)
    real_time_dashboard_alerts = db.Column(db.Boolean, default=True)
    critical_vulnerability_alerts = db.Column(db.Boolean, default=True)
    scan_completion_notifications = db.Column(db.Boolean, default=True)
    email_frequency = db.Column(db.String(40), default="instant")

    live_cve_monitoring = db.Column(db.Boolean, default=True)
    strict_risk_scoring = db.Column(db.Boolean, default=False)
    include_dev_dependencies = db.Column(db.Boolean, default=True)
    typosquatting_detection = db.Column(db.Boolean, default=True)
    abandoned_package_detection = db.Column(db.Boolean, default=True)
    license_compliance_enforcement = db.Column(db.Boolean, default=False)
    auto_fix_vulnerable_packages = db.Column(db.Boolean, default=False)
    supply_chain_analysis = db.Column(db.Boolean, default=True)
    vulnerability_threshold = db.Column(db.String(40), default="medium")
    severity_threshold = db.Column(db.String(40), default="medium")
    auto_generate_safe_manifest = db.Column(db.Boolean, default=True)
    preferred_manifest_type = db.Column(db.String(80), default="requirements.txt")

    ai_vulnerability_explanations = db.Column(db.Boolean, default=True)
    ai_remediation_suggestions = db.Column(db.Boolean, default=True)
    beginner_cybersecurity_mode = db.Column(db.Boolean, default=True)
    explain_risks_simple_language = db.Column(db.Boolean, default=True)
    auto_generated_fix_summaries = db.Column(db.Boolean, default=True)

    theme = db.Column(db.String(40), default="dark")
    dashboard_density = db.Column(db.String(40), default="comfortable")
    dashboard_animations = db.Column(db.Boolean, default=True)
    glassmorphism_effects = db.Column(db.Boolean, default=True)
    accent_color = db.Column(db.String(40), default="#22d3ee")

    generate_sbom_automatically = db.Column(db.Boolean, default=False)
    repository_auto_scanning = db.Column(db.Boolean, default=False)
    cache_cve_results = db.Column(db.Boolean, default=True)
    developer_debug_mode = db.Column(db.Boolean, default=False)

    integrations = db.Column(db.JSON, default=dict)

    def to_dict(self):
        defaults = self.defaults()
        data = {}
        for key, default_value in defaults.items():
            value = getattr(self, key, None)
            data[key] = default_value if value is None else value

        integrations = data.get("integrations") or {}
        data["integrations"] = {
            **self.DEFAULT_INTEGRATIONS,
            **integrations,
        }
        return data

    @classmethod
    def defaults(cls):
        return {
            "workspace_name": "DependGuard Workspace",
            "default_scan_depth": "standard",
            "preferred_ecosystem": "multi-language",
            "auto_scan_uploads": True,
            "remember_last_settings": True,
            "notifications_enabled": True,
            "email_alerts": True,
            "weekly_security_reports": False,
            "real_time_dashboard_alerts": True,
            "critical_vulnerability_alerts": True,
            "scan_completion_notifications": True,
            "email_frequency": "instant",
            "live_cve_monitoring": True,
            "strict_risk_scoring": False,
            "include_dev_dependencies": True,
            "typosquatting_detection": True,
            "abandoned_package_detection": True,
            "license_compliance_enforcement": False,
            "auto_fix_vulnerable_packages": False,
            "supply_chain_analysis": True,
            "vulnerability_threshold": "medium",
            "severity_threshold": "medium",
            "auto_generate_safe_manifest": True,
            "preferred_manifest_type": "requirements.txt",
            "ai_vulnerability_explanations": True,
            "ai_remediation_suggestions": True,
            "beginner_cybersecurity_mode": True,
            "explain_risks_simple_language": True,
            "auto_generated_fix_summaries": True,
            "theme": "dark",
            "dashboard_density": "comfortable",
            "dashboard_animations": True,
            "glassmorphism_effects": True,
            "accent_color": "#22d3ee",
            "generate_sbom_automatically": False,
            "repository_auto_scanning": False,
            "cache_cve_results": True,
            "developer_debug_mode": False,
            "integrations": cls.DEFAULT_INTEGRATIONS,
        }
