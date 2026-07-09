import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "ksaradecor-dev-change-me")
    DATABASE_PATH = os.environ.get(
        "DATABASE_PATH",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "shop.db"),
    )
    COLLECTIONS_PATH = os.environ.get(
        "COLLECTIONS_PATH",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "collections.json"),
    )
    MEDIA_ROOT = os.environ.get(
        "MEDIA_ROOT",
        os.path.abspath(
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", "images", "KsaraDecor")
        ),
    )
    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SECRET_KEY = "test-secret"
