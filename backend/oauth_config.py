from extensions import oauth


def configure_oauth(app):
    oauth.init_app(app)
    _log_missing_provider_config(app)

    if app.config["GOOGLE_CLIENT_ID"] and app.config["GOOGLE_CLIENT_SECRET"]:
        oauth.register(
            name="google",
            client_id=app.config["GOOGLE_CLIENT_ID"],
            client_secret=app.config["GOOGLE_CLIENT_SECRET"],
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )

    if app.config["GITHUB_CLIENT_ID"] and app.config["GITHUB_CLIENT_SECRET"]:
        oauth.register(
            name="github",
            client_id=app.config["GITHUB_CLIENT_ID"],
            client_secret=app.config["GITHUB_CLIENT_SECRET"],
            access_token_url="https://github.com/login/oauth/access_token",
            authorize_url="https://github.com/login/oauth/authorize",
            api_base_url="https://api.github.com/",
            client_kwargs={"scope": "read:user user:email"},
        )

    if app.config["GITLAB_CLIENT_ID"] and app.config["GITLAB_CLIENT_SECRET"]:
        oauth.register(
            name="gitlab",
            client_id=app.config["GITLAB_CLIENT_ID"],
            client_secret=app.config["GITLAB_CLIENT_SECRET"],
            access_token_url="https://gitlab.com/oauth/token",
            authorize_url="https://gitlab.com/oauth/authorize",
            api_base_url="https://gitlab.com/api/v4/",
            client_kwargs={"scope": "read_user email openid"},
        )


def _log_missing_provider_config(app):
    providers = {
        "google": ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
        "github": ("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"),
        "gitlab": ("GITLAB_CLIENT_ID", "GITLAB_CLIENT_SECRET"),
    }

    for provider, keys in providers.items():
        missing = [key for key in keys if not app.config.get(key)]
        if missing:
            app.logger.warning(
                "[OAuth:%s] Missing client configuration: %s",
                provider,
                ", ".join(missing),
            )
