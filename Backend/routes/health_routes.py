from flask import Blueprint
from helpers.responses import success_response, error_response
from core.database import execute_query
from config.settings import SERVER_IP, SERVER_PORT

health_bp = Blueprint("health_bp", __name__)

@health_bp.route("/", methods=["GET"])
def index():
    return success_response("Restaurant backend is running.", {
        "server_ip": SERVER_IP,
        "server_port": SERVER_PORT
    })

@health_bp.route("/api/health", methods=["GET"])
def health_check():
    try:
        execute_query("SELECT 1", fetchone=True)
        return success_response("Server and database are healthy.")
    except Exception as e:
        return error_response(f"Health check failed: {str(e)}", 500)
