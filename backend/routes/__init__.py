from .advanced_routes import advanced_bp
from .auth_routes import auth_bp
from .oauth_routes import oauth_bp
from .password_reset_routes import password_reset_bp
from .scan_routes import scan_bp
from .settings_routes import settings_bp


__all__ = ["advanced_bp", "auth_bp", "oauth_bp", "password_reset_bp", "scan_bp", "settings_bp"]
