import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)


def _database_uri():
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        return f"sqlite:///{(BASE_DIR / 'dependguard.db').as_posix()}"

    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url


def _frontend_origins(frontend_url):
    configured_origins = os.getenv("FRONTEND_ORIGIN", frontend_url)
    origins = [origin.strip().rstrip("/") for origin in configured_origins.split(",") if origin.strip()]
    if frontend_url and frontend_url not in origins:
        origins.append(frontend_url)
    return origins


DATABASE_URI = _database_uri()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dependguard-dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    SQLALCHEMY_DATABASE_URI = DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    TOKEN_EXPIRES_HOURS = int(os.getenv("TOKEN_EXPIRES_HOURS", "24"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
    USE_LIVE_CVE = os.getenv("USE_LIVE_CVE", "true").lower() == "true"
    OSV_API_URL = os.getenv("OSV_API_URL", "https://api.osv.dev/v1/query")
    OSV_CACHE_HOURS = int(os.getenv("OSV_CACHE_HOURS", "24"))
    OSV_TIMEOUT_SECONDS = int(os.getenv("OSV_TIMEOUT_SECONDS", "8"))

    FRONTEND_ORIGIN = _frontend_origins(FRONTEND_URL)

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
    GITHUB_API_TOKEN = os.getenv("GITHUB_API_TOKEN", "")
    GITLAB_CLIENT_ID = os.getenv("GITLAB_CLIENT_ID", "")
    GITLAB_CLIENT_SECRET = os.getenv("GITLAB_CLIENT_SECRET", "")
    AI_SECURITY_API_KEY = os.getenv("AI_SECURITY_API_KEY", "")

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_DEBUG = os.getenv("MAIL_DEBUG", "false").lower() == "true"
    SEND_EMAILS = os.getenv("SEND_EMAILS", "true").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME)
    PASSWORD_RESET_TOKEN_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_MINUTES", "15"))
