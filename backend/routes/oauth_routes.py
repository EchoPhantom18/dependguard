from urllib.parse import urlencode

from authlib.integrations.base_client.errors import OAuthError
from flask import Blueprint, current_app, redirect, request
from requests import HTTPError, RequestException

from auth import create_token
from extensions import db, oauth
from models import User, UserSettings


oauth_bp = Blueprint("oauth", __name__, url_prefix="/auth")


@oauth_bp.get("/google/login")
def google_login():
    return _start_oauth("google")


@oauth_bp.get("/google/callback")
def google_callback():
    return _complete_oauth("google")


@oauth_bp.get("/github/login")
def github_login():
    return _start_oauth("github")


@oauth_bp.get("/github/callback")
def github_callback():
    return _complete_oauth("github")


@oauth_bp.get("/gitlab/login")
def gitlab_login():
    return _start_oauth("gitlab")


@oauth_bp.get("/gitlab/callback")
def gitlab_callback():
    return _complete_oauth("gitlab")


def _start_oauth(provider):
    config_error = _missing_config_reason(provider)
    if config_error:
        current_app.logger.warning("[OAuth:%s] %s", provider, config_error)
        return _redirect_failure(config_error)

    client = oauth.create_client(provider)
    if not client:
        reason = f"{provider} oauth client is not registered"
        current_app.logger.error("[OAuth:%s] %s", provider, reason)
        return _redirect_failure(reason)

    redirect_uri = _callback_url(provider)
    _log_callback_url_check(provider, redirect_uri)

    try:
        return client.authorize_redirect(redirect_uri)
    except OAuthError as error:
        reason = _provider_error_reason(error)
        current_app.logger.exception("[OAuth:%s] Provider authorization error: %s", provider, reason)
        return _redirect_failure(reason)
    except Exception as error:
        reason = f"failed to start {provider} oauth login"
        current_app.logger.exception("[OAuth:%s] %s: %s", provider, reason, error)
        return _redirect_failure(reason)


def _complete_oauth(provider):
    provider_error = request.args.get("error")
    if provider_error:
        reason = request.args.get("error_description") or provider_error
        current_app.logger.error("[OAuth:%s] Provider callback error: %s", provider, reason)
        if "redirect" in reason.lower() or "callback" in reason.lower():
            current_app.logger.error(
                "[OAuth:%s] Possible callback mismatch. Expected callback URL: %s",
                provider,
                _callback_url(provider),
            )
        return _redirect_failure(reason)

    config_error = _missing_config_reason(provider)
    if config_error:
        current_app.logger.warning("[OAuth:%s] %s", provider, config_error)
        return _redirect_failure(config_error)

    client = oauth.create_client(provider)
    if not client:
        reason = f"{provider} oauth client is not registered"
        current_app.logger.error("[OAuth:%s] %s", provider, reason)
        return _redirect_failure(reason)

    try:
        client.authorize_access_token()
    except OAuthError as error:
        reason = _provider_error_reason(error)
        current_app.logger.exception("[OAuth:%s] Token exchange failed: %s", provider, reason)
        db.session.rollback()
        return _redirect_failure(reason)
    except Exception as error:
        reason = f"{provider} oauth token exchange failed"
        current_app.logger.exception("[OAuth:%s] %s: %s", provider, reason, error)
        db.session.rollback()
        return _redirect_failure(reason)

    try:
        profile = _fetch_profile(provider, client)
    except (HTTPError, RequestException, ValueError) as error:
        reason = f"failed user info fetch: {error}"
        current_app.logger.exception("[OAuth:%s] %s", provider, reason)
        db.session.rollback()
        return _redirect_failure(reason)
    except Exception as error:
        reason = f"failed user info fetch for {provider}"
        current_app.logger.exception("[OAuth:%s] %s: %s", provider, reason, error)
        db.session.rollback()
        return _redirect_failure(reason)

    try:
        user = _upsert_oauth_user(profile)
    except Exception as error:
        reason = f"failed to create or update oauth user: {error}"
        current_app.logger.exception("[OAuth:%s] %s", provider, reason)
        db.session.rollback()
        return _redirect_failure(reason)

    try:
        jwt_token = create_token(user)
    except Exception:
        reason = "jwt creation failed after oauth login"
        current_app.logger.exception("[OAuth:%s] %s", provider, reason)
        db.session.rollback()
        return _redirect_failure(reason)

    return redirect(f"{current_app.config['FRONTEND_URL']}/oauth-success?{urlencode({'token': jwt_token})}")


def _fetch_profile(provider, client):
    if provider == "google":
        response = client.get("https://openidconnect.googleapis.com/v1/userinfo")
        response.raise_for_status()
        data = response.json()
        profile = {
            "provider": "google",
            "provider_user_id": data.get("sub"),
            "email": data.get("email"),
            "name": data.get("name") or data.get("email"),
            "avatar_url": data.get("picture"),
        }
        _validate_profile(provider, profile)
        return profile

    if provider == "github":
        user_response = client.get("user")
        user_response.raise_for_status()
        user_data = user_response.json()
        email = user_data.get("email") or _fetch_github_primary_email(client)
        profile = {
            "provider": "github",
            "provider_user_id": str(user_data.get("id") or ""),
            "email": email,
            "name": user_data.get("name") or user_data.get("login") or email,
            "avatar_url": user_data.get("avatar_url"),
        }
        _validate_profile(provider, profile)
        return profile

    user_response = client.get("user")
    user_response.raise_for_status()
    user_data = user_response.json()
    profile = {
        "provider": "gitlab",
        "provider_user_id": str(user_data.get("id") or ""),
        "email": user_data.get("email") or user_data.get("public_email"),
        "name": user_data.get("name") or user_data.get("username") or user_data.get("email"),
        "avatar_url": user_data.get("avatar_url"),
    }
    _validate_profile(provider, profile)
    return profile


def _fetch_github_primary_email(client):
    response = client.get("user/emails")
    response.raise_for_status()
    emails = response.json()
    for item in emails:
        if item.get("primary") and item.get("verified"):
            return item.get("email")
    for item in emails:
        if item.get("verified"):
            return item.get("email")
    return None


def _validate_profile(provider, profile):
    if not profile.get("provider_user_id"):
        raise ValueError(f"{provider} did not return a user id")
    if not profile.get("email"):
        raise ValueError(f"{provider} did not return an email address")


def _upsert_oauth_user(profile):
    email = (profile.get("email") or "").strip().lower()
    provider = profile.get("provider")
    provider_user_id = str(profile.get("provider_user_id") or "")

    if not email:
        raise ValueError("OAuth provider did not return an email address")

    user = None
    if provider_user_id:
        user = User.query.filter_by(
            auth_provider=provider,
            provider_user_id=provider_user_id,
        ).first()

    if not user:
        user = User.query.filter_by(email=email).first()

    if not user:
        user = User(
            name=profile.get("name") or email.split("@")[0],
            email=email,
            password_hash="",
            auth_provider=provider,
            provider_user_id=provider_user_id,
            avatar_url=profile.get("avatar_url"),
        )
        db.session.add(user)
        db.session.flush()
        db.session.add(UserSettings(user_id=user.id))
    else:
        user.name = profile.get("name") or user.name
        user.avatar_url = profile.get("avatar_url") or user.avatar_url
        user.auth_provider = provider
        user.provider_user_id = provider_user_id or user.provider_user_id
        if not user.settings:
            db.session.add(UserSettings(user_id=user.id))

    db.session.commit()
    return user


def _callback_url(provider):
    return f"{current_app.config['BACKEND_URL']}/auth/{provider}/callback"


def _redirect_failure(reason="oauth_failed"):
    query = urlencode({"error": "oauth_failed", "reason": _safe_reason(reason)})
    return redirect(f"{current_app.config['FRONTEND_URL']}/login?{query}")


def _missing_config_reason(provider):
    keys = {
        "google": ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
        "github": ("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"),
        "gitlab": ("GITLAB_CLIENT_ID", "GITLAB_CLIENT_SECRET"),
    }[provider]
    missing = [key for key in keys if not current_app.config.get(key)]
    if missing:
        return f"missing {provider} oauth config: {', '.join(missing)}"
    return None


def _log_callback_url_check(provider, redirect_uri):
    current_app.logger.info("[OAuth:%s] Starting login with callback URL: %s", provider, redirect_uri)
    backend_url = current_app.config["BACKEND_URL"]
    request_base = request.host_url.rstrip("/")
    if backend_url != request_base:
        current_app.logger.warning(
            "[OAuth:%s] Possible callback mismatch: BACKEND_URL=%s but current request host is %s",
            provider,
            backend_url,
            request_base,
        )


def _provider_error_reason(error):
    description = getattr(error, "description", None)
    if description:
        return str(description)
    oauth_error = getattr(error, "error", None)
    if oauth_error:
        return str(oauth_error)
    return str(error)


def _safe_reason(reason):
    text = str(reason or "oauth_failed")
    return text[:300]
