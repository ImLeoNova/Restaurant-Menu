import os
from flask import Flask, jsonify
from flasgger import Swagger
from core.extensions import cors
from core.schema import ensure_schema
from config.settings import MAX_CONTENT_LENGTH, CORS_ORIGINS, S3_ENDPOINT_URL

from routes.health_routes import health_bp
from routes.user_routes import user_bp
from routes.admin_routes import admin_bp
from routes.ai_routes import ai_bp
from routes.product_routes import product_bp
from routes.token_routes import token_bp
from routes.comment_routes import comment_bp
from routes.category_routes import category_bp
from routes.auth_routes import auth_bp
from routes.order_routes import order_bp

from helpers.responses import error_response

def create_app():
    app = Flask(__name__)

    app.config["SWAGGER"] = {
        "title": "Restaurant Menu API",
        "uiversion": 3,
        "openapi": "3.0.2",
    }

    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec_1",
                "route": "/swagger.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/swagger/",
    }

    Swagger(app, config=swagger_config)

    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

    ensure_schema()

    try:
        from services.otp_service import ensure_otp_table
        ensure_otp_table()
    except Exception as e:
        print(f"[OTP] Table ensure skipped: {e}")

    cors.init_app(
        app,
        resources={r"/*": {"origins": CORS_ORIGINS}},
        supports_credentials=True,
        expose_headers=["Content-Type", "Authorization"],
    )

    @app.after_request
    def apply_security_headers(response):
        s3_origin = ""
        if S3_ENDPOINT_URL:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(S3_ENDPOINT_URL)
                s3_origin = f" {parsed.scheme}://{parsed.netloc}"
            except Exception:
                pass

        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            f"img-src 'self' data:{s3_origin}; "
            "connect-src 'self' https://api.openai.com; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

    app.register_blueprint(health_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(token_bp)
    app.register_blueprint(comment_bp)
    app.register_blueprint(category_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(order_bp)

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
