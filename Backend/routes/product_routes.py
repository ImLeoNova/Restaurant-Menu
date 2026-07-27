from flask import Blueprint, request, send_from_directory
from models.product import Product
from middleware.auth import token_required, admin_required
from helpers.responses import success_response, error_response
from config.settings import UPLOAD_FOLDER
import os
product_bp = Blueprint("product_bp", __name__)

@product_bp.route("/api/product/add", methods=["POST"])
@token_required
@admin_required
def add_product():
    try:
        if "file" not in request.files:
            return error_response("No file part in request.", 400)

        image_file = request.files["file"]
        title = request.form.get("title")
        category = request.form.get("category")
        description = request.form.get("description")
        price = request.form.get("price")

        product_class = Product()
        status, message = product_class.add_product(
            image_file=image_file,
            title=title,
            description=description,
            category=category,
            price=price
        )

        if not status:
            return error_response(message, 400)

        return success_response(message, status_code=201)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@product_bp.route("/api/product/list", methods=["GET"])
def get_products():
    try:
        category = request.args.get("category")
        search = request.args.get("search")

        product_class = Product()
        products = product_class.get_all_products(category=category, search=search)

        if not products:
            return error_response("No products found.", 404)

        return success_response("Products fetched successfully.", products)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@product_bp.route("/api/product/<int:product_id>", methods=["GET"])
def get_single_product(product_id):
    try:
        product_class = Product(product_id)
        item = product_class.get_single_product()

        if not item:
            return error_response("Product not found.", 404)

        return success_response("Product fetched successfully.", item)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@product_bp.route("/api/product/<int:product_id>", methods=["PUT"])
@token_required
@admin_required
def update_product(product_id):
    try:
        title = request.form.get("title")
        category = request.form.get("category")
        description = request.form.get("description")
        price = request.form.get("price")
        image_file = request.files.get("file")

        product_class = Product(product_id)
        status, message = product_class.update_product(
            title=title,
            description=description,
            category=category,
            price=price,
            image_file=image_file
        )

        if not status:
            if message == "Product not found.":
                return error_response(message, 404)
            return error_response(message, 400)

        updated = product_class.get_single_product()
        return success_response(message, updated)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@product_bp.route("/api/product/<int:product_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_product(product_id):
    try:
        product_class = Product(product_id)
        status, message = product_class.delete_product()

        if not status:
            return error_response(message, 404)

        return success_response(message)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@product_bp.route("/api/product/categories", methods=["GET"])
def get_categories():
    try:
        from models.category import Category

        categories = Category().get_all_categories()
        return success_response("Categories fetched successfully.", categories)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@product_bp.route("/api/product/image/<string:productID>", methods=["GET"])
def get_product_image(productID):
    try:
        product_req = Product(productID)
        product_img = product_req.get_product_image_name()

        if not product_img:
            return error_response("Product not found.", 404)

        return os.path.abspath(UPLOAD_FOLDER),

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)
