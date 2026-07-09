import os

from flask import Flask

from app.config import DevelopmentConfig, ProductionConfig, TestingConfig
from app.database import close_db
from app.routes import bp


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    config_map = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }
    config = config_map.get(config_name, DevelopmentConfig)

    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates"),
        static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), "static"),
    )
    app.config.from_object(config)
    app.register_blueprint(bp)
    app.teardown_appcontext(close_db)

    os.makedirs(os.path.dirname(app.config["DATABASE_PATH"]), exist_ok=True)

    return app
