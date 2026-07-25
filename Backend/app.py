import os
from flask import Flask
from core.extensions import cors
from core.schema import ensure_schema
from config.settings import UPLOAD_FOLDER, CATEGORY_UPLOAD_FOLDER, MAX_CONTENT_LENGTH

from routes.health_routes import health_bp
from routes.user_routes import user_bp
from routes.admin_routes import admin_bp
from routes.ai_routes import ai_bp
from routes.product_routes import product_bp
from routes.token_routes import token_bp
from routes.comment_routes import comment_bp
from routes.category_routes import category_bp

from helpers.responses import error_response

def create_app():
    app = Flask(__name__)

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(CATEGORY_UPLOAD_FOLDER, exist_ok=True)

    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
    app.config["CATEGORY_UPLOAD_FOLDER"] = CATEGORY_UPLOAD_FOLDER
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

    ensure_schema()

    cors.init_app(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(token_bp)
    app.register_blueprint(comment_bp)
    app.register_blueprint(category_bp)

    register_error_handlers(app)

    return app

def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found_error(error):
        return error_response("Route not found.", 404)

    @app.errorhandler(405)
    def method_not_allowed_error(error):
        return error_response("Method not allowed.", 405)

    @app.errorhandler(413)
    def file_too_large_error(error):
        return error_response("Uploaded file is too large.", 413)

    @app.errorhandler(500)
    def internal_server_error(error):
        return error_response("Internal server error.", 500)
