from flask import Blueprint, request, redirect
from models.category import Category
from middleware.auth import token_required, admin_required
from helpers.responses import success_response, error_response
from storage.s3_client import s3_client

category_bp = Blueprint("category_bp", __name__)


@category_bp.route("/api/category/list", methods=["GET"])
def list_categories():
    try:
        categories = Category().get_all_categories()
        return success_response("Categories fetched successfully.", categories)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@category_bp.route("/api/category/add", methods=["POST"])
@token_required
@admin_required
def add_category():
    try:
        if "file" not in request.files:
            return error_response("تصویر دسته‌بندی الزامی است.", 400)

        image_file = request.files["file"]
        title = request.form.get("title")
        slug = request.form.get("slug") or request.form.get("category")

        status, message = Category().add_category(
            image_file=image_file,
            title=title,
            slug=slug,
        )

        if not status:
            return error_response(message, 400)

        categories = Category().get_all_categories()
        return success_response(message, categories, status_code=201)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@category_bp.route("/api/category/<int:category_id>", methods=["GET"])
def get_category(category_id):
    try:
        category = Category(category_id).get_single_category()
        if not category:
            return error_response("دسته‌بندی پیدا نشد.", 404)
        return success_response("Category fetched successfully.", category)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@category_bp.route("/api/category/<int:category_id>/products", methods=["GET"])
def get_category_products(category_id):
    try:
        category, products = Category(category_id).get_products()
        if not category:
            return error_response("دسته‌بندی پیدا نشد.", 404)

        return success_response(
            "Category products fetched successfully.",
            {
                "category": category,
                "products": products,
            },
        )
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@category_bp.route("/api/category/<int:category_id>", methods=["PUT"])
@token_required
@admin_required
def update_category(category_id):
    try:
        title = request.form.get("title")
        slug = request.form.get("slug") or request.form.get("category")
        image_file = request.files.get("file")

        status, message = Category(category_id).update_category(
            title=title,
            slug=slug,
            image_file=image_file,
        )

        if not status:
            status_code = 404 if message == "دسته‌بندی پیدا نشد." else 400
            return error_response(message, status_code)

        updated = Category(category_id).get_single_category()
        return success_response(message, updated)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@category_bp.route("/api/category/<int:category_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_category(category_id):
    try:
        status, message = Category(category_id).delete_category()
        if not status:
            status_code = 404 if message == "دسته‌بندی پیدا نشد." else 400
            return error_response(message, status_code)
        return success_response(message)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@category_bp.route("/api/category/image/<int:category_id>", methods=["GET"])
def get_category_image(category_id):
    try:
        object_key = Category(category_id).get_category_image_name()
        if not object_key:
            return error_response("تصویر دسته‌بندی پیدا نشد.", 404)

        signed_url = s3_client.get_signed_url(object_key, expiry_seconds=3600)
        return redirect(signed_url, code=302)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)
