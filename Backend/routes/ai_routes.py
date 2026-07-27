import json
import re
from flask import Blueprint, request
from models.account import Account
from models.product import Product
from middleware.auth import token_required
from helpers.responses import success_response, error_response
from core.database import execute_query
from Ai.ai import AI


def sanitize_ai_response(text):
    if text is None:
        return ""

    # Remove dangerous tags and attributes, but keep safe HTML like images and layout tags.
    text = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', '', text)
    text = re.sub(r'(?i)\s(on\w+)\s*=\s*("[^"]*"|\'[^\']*\'|[^>\s]+)', '', text)
    text = re.sub(r'(?i)\s(href|src)\s*=\s*("|\')\s*(javascript:|data:)[^"\']*("|\')', '', text)

    allowed_tags = {'br', 'p', 'img', 'div', 'span', 'strong', 'em', 'ul', 'ol', 'li', 'a'}
    allowed_attrs = {'src', 'alt', 'title', 'href', 'class', 'width', 'height', 'style'}

    def sanitize_tag(match):
        closing = bool(match.group(1))
        tag = match.group(2).lower()
        attrs = match.group(3) or ''

        if tag not in allowed_tags:
            return ''

        if closing:
            return f'</{tag}>'

        sanitized_attrs = []
        for attr_match in re.finditer(r'([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))', attrs):
            name = attr_match.group(1).lower()
            value = attr_match.group(3) or attr_match.group(4) or attr_match.group(5) or ''
            if name not in allowed_attrs:
                continue
            if name in ('src', 'href'):
                if not re.match(r'^https?://', value, flags=re.IGNORECASE):
                    continue
            sanitized_attrs.append(f'{name}="{value}"')

        attr_string = ' ' + ' '.join(sanitized_attrs) if sanitized_attrs else ''
        return f'<{tag}{attr_string}>'

    text = re.sub(r'<(/?)([a-zA-Z0-9]+)([^>]*)>', sanitize_tag, text)
    return text.strip()

ai_bp = Blueprint("ai_bp", __name__)

@ai_bp.route("/api/user/ai", methods=["POST"])
@token_required
def ai_message():
    try:
        body = request.get_json(silent=True) or {}
        message = body.get("message")

        if not message:
            return error_response("AI message is required.", 400)

        user_token = request.user
        user_id = user_token["user_id"]

        account = Account(user_id)
        user_data = account.get_user_data(include_password=False)

        if not user_data:
            return error_response("User not found.", 404)

        conversation_raw = user_data.get("conversation_history", "[]")

        try:
            conversation_history = json.loads(conversation_raw) if conversation_raw else []
        except Exception:
            conversation_history = []

        if len(conversation_history) > 20:
            account.reset_conversation_history()
            return success_response("AI memory was cleared due to conversation length.", {
                "message": "حافظه ی هوش مصنوعی بخاطر محدودیت ها حذف شد ."
            })

        product_class = Product()
        all_products = product_class.get_all_products()

        ai_class = AI(
            conversation_history=conversation_history,
            username=user_data["username"],
            otherLearnings=[
                {
                    "role": "system",
                    "content": f"""
                    و اینکه این لیست تمامی محصولات هست که به صورت جی سون برات گذاشتم و خودت میتونی بخونی همش رو
                    سعی کن همیشه که اول عکس محصول رو بدی و بعدش توضیحات
                    و اینکه عکس محصولات در وسط قرار بگیرند و یکم کوچک تر باشند از عکس اصلی
                    سایز عکس رو مثلا در حد 50 یا 100 پیکسل در نظر میگیری !
                    و هر موقع که ازت محصولات رو خواستن محصولات رو نمایش میدی!
                    و اگر نه تو سرگرمشون میکنی و خیلی عاشقانه و خفن صحبت میکنی
                    یکم توی توضیحات محصول که بهت داده شده دخالت کن و تغیراتی توش انجام بده و خیلی خفن تر برای مشتری ارسال کن
                    اینو بدون که اصلا اجازه نداری محصولات رو تا زمانی که مشتری نگفته ارسال کنی !
                    تو قابلیت ثبت سفارش نداری
                    تو کار اصلی ات سرگرمی مشتری هست و اینکه چون تو داری به صورت اچ تی ام ال میفرستی دسترسی اینو هم داری که عکس هارو به وسط بیاری و خوشگل تر درستش کنی
                    مهم ترین چیز اینه که فقط زمانی که مشتری خواست براش محصولات رو بفرستی !!!
                    به هیچ وجه از کلمات انگلیسی استفاده نمیکنی ! حتی فینگلیش حروف کاملا باید فارسی باشه
                    سایز عکس ها نباید بزرگ باشه ! هر عکس که میفرستی اینطوری باید باشه
                    عکس ها در یک div قرار میگیرند که در center باشند

                    <div class="flex w-full justify-center">
                    <img src="src" alt="اسم غذا" width="200" class="" />
                    </div>

                    {all_products} این تمامی محصولات هست :
                    """
                }
            ]
        )

        output, new_conversation_history = ai_class.ai_proccess(message=message)
        output = sanitize_ai_response(output)
        new_conversation_history = [
            {"role": item["role"], "content": sanitize_ai_response(item["content"])}
            for item in new_conversation_history
        ]

        execute_query(
            "UPDATE `restaurantusers` SET `conversation_history` = %s WHERE `user_ID` = %s",
            (json.dumps(new_conversation_history, ensure_ascii=False), user_id),
            commit=True
        )

        return success_response("AI response generated successfully.", {"message": output})

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@ai_bp.route("/api/user/ai/reset", methods=["POST"])
@token_required
def reset_ai_history():
    try:
        account = Account(request.user["user_id"])
        status, message = account.reset_conversation_history()

        if not status:
            return error_response(message, 400)

        return success_response(message)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)
