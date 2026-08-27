import os

from flask import Flask

from .config import config_by_name


def create_app(env="development"):
    root = os.path.dirname(os.path.dirname(__file__))
    app = Flask(
        __name__,
        template_folder=os.path.join(root, "templates"),
        static_folder=os.path.join(root, "static"),
    )
    app.config.from_object(config_by_name[env])

    from .routes import bp
    app.register_blueprint(bp)

    return app
