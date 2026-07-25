from flask import jsonify

def success_response(message="Success", data=None, status_code=200):
    return jsonify({
        "success": True,
        "message": message,
        "data": data
    }), status_code

def error_response(message="Error", status_code=400):
    return jsonify({
        "success": False,
        "message": message
    }), status_code
