from flask import Blueprint, request
from models.comment import Comment
from models.comment_summary import CommentSummary
from models.product import Product
from middleware.auth import token_required, admin_required
from helpers.responses import success_response, error_response

comment_bp = Blueprint("comment_bp", __name__)


@comment_bp.route("/api/product/<int:product_id>/comments", methods=["GET"])
def get_product_comments(product_id):
    try:
        product = Product(product_id).get_single_product()
        if not product:
            return error_response("Product not found.", 404)

        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)
        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        comment_model = Comment()
        comments = comment_model.get_by_product(product_id, limit=limit, offset=offset)
        stats = comment_model.get_stats(product_id)

        return success_response(
            "Comments fetched successfully.",
            {
                "comments": comments,
                "stats": stats,
            },
        )
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@comment_bp.route("/api/product/<int:product_id>/comments/summary", methods=["GET"])
def get_product_comments_summary(product_id):
    try:
        product = Product(product_id).get_single_product()
        if not product:
            return error_response("Product not found.", 404)

        comment_model = Comment()
        stats = comment_model.get_stats(product_id)

        if stats["total"] < CommentSummary.MIN_COMMENTS:
            return success_response(
                "Not enough comments to summarize yet.",
                {
                    "available": False,
                    "reason": "not_enough_comments",
                    "min_required": CommentSummary.MIN_COMMENTS,
                    "total": stats["total"],
                },
            )

        summary_model = CommentSummary(product_id)
        cached = summary_model.get_cached()

        is_fresh = (
            cached
            and cached["comment_count"] == stats["total"]
            and abs(cached["average_rating"] - stats["average_rating"]) < 0.05
        )

        if is_fresh:
            return success_response(
                "Summary fetched from cache.",
                {"available": True, "cached": True, **cached},
            )

        comments = comment_model.get_by_product(product_id, limit=60, offset=0)

        try:
            summary, positives, negatives = CommentSummary.generate_from_comments(
                product_title=product.get("title", ""),
                comments=comments,
            )
        except Exception:
            if cached:
                return success_response(
                    "Serving last known summary; regeneration failed.",
                    {"available": True, "cached": True, "stale": True, **cached},
                )
            return error_response("Failed to generate review summary.", 502)

        saved = summary_model.save(
            summary=summary,
            positives=positives,
            negatives=negatives,
            comment_count=stats["total"],
            average_rating=stats["average_rating"],
        )

        return success_response(
            "Summary generated successfully.",
            {"available": True, "cached": False, **saved},
        )
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@comment_bp.route("/api/product/<int:product_id>/comments", methods=["POST"])
@token_required
def add_product_comment(product_id):
    try:
        body = request.get_json(silent=True) or {}
        content = body.get("content")
        rating = body.get("rating", 5)
        user_id = request.user.get("user_id")

        if not user_id:
            return error_response("Invalid token payload.", 401)

        status, message, comment = Comment().add_comment(
            product_id=product_id,
            user_id=user_id,
            content=content,
            rating=rating,
        )

        if not status:
            status_code = 404 if message == "Product not found." else 400
            return error_response(message, status_code)

        return success_response(message, comment, status_code=201)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@comment_bp.route("/api/product/comments/<int:comment_id>", methods=["PUT"])
@token_required
def update_comment(comment_id):
    try:
        body = request.get_json(silent=True) or {}
        user_id = request.user.get("user_id")
        role = str(request.user.get("role", "")).lower()
        is_admin = role in ("admin", "founder")

        status, message, comment = Comment(comment_id).update_comment(
            user_id=user_id,
            content=body.get("content"),
            rating=body.get("rating"),
            is_admin=is_admin,
        )

        if not status:
            if message == "Comment not found.":
                return error_response(message, 404)
            if "only edit" in message:
                return error_response(message, 403)
            return error_response(message, 400)

        return success_response(message, comment)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@comment_bp.route("/api/product/comments/<int:comment_id>", methods=["DELETE"])
@token_required
def delete_comment(comment_id):
    try:
        user_id = request.user.get("user_id")
        role = str(request.user.get("role", "")).lower()
        is_admin = role in ("admin", "founder")

        status, message = Comment(comment_id).delete_comment(
            user_id=user_id,
            is_admin=is_admin,
        )

        if not status:
            if message == "Comment not found.":
                return error_response(message, 404)
            if "only delete" in message:
                return error_response(message, 403)
            return error_response(message, 400)

        return success_response(message)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)
