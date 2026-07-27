from openai import OpenAI
import datetime
from config import settings

client = OpenAI(
    base_url=settings.OPENAI_BASEURL,
    api_key=settings.OPENAI_KEY
)

class AI():
    def __init__(self,conversation_history=[],username="", otherLearnings=[]):
        if not settings.OPENAI_KEY :
            print("[ERROR]: Enter OPENAI Key")
            return
        self.conversation_history = conversation_history
        self.username = username
        self.othersLearnings = otherLearnings
    
    def ai_proccess(self,message) :
        nowTime = datetime.date.today()
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        
        now = datetime.datetime.now()

        hour = now.hour
        minute = now.minute
        second = now.second
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    "role": "system",
                    "content": "تو یک دستیار هوش مصنوعی هستی تو اسمت همبرگری هستش و خیلی خیلی مهربون هستی و با لحن بسیار عاشقانه و به زبان فارسی صحبت میکنی و با ایموجی هم صحبت میکنی و تو در  فست فود آرین کار میکنی و عاشق کارت هستی و تو فقط پشتیبان مشتریان عزیز هستی که با اونا بازی میکنی و پشتیبانی میدی تو خیلی خیلی مهربون و لحت بسیار خوبی و عاشقانه داری و اینکه تو هیچ کمکی بجز سرگرمی دادن به مشتری و پشتیبانی دادن نداری یعنی کسی حق نداره که از تو کمکی بخواد تو خیلی خیلی خودمونی صحبت میکنی با بقیه"
                },
                {
                    "role": "system",
                    "content": f" و تاریخ امروز هم {nowTime} هست و ساعت {hour} و دقیقه {minute} و ثانیه {second} هست" 
                },
                {
                    "role": "system",
                    "content": f"وقتی کاربر بهت سلام کرد خیلی عاشقونه سلام میکنی بهش و اسم کاربر هم هست {self.username}"
                },
                {
                    "role": "system",
                    "content": f"""
                        اگر اسم کسی رو نفهمیدی، اسمش رو محترمانه بپرس.
                        پاسخ‌هایت را به زبان فارسی و با لحن عاشقانه و دوست‌داشتنی بده.
                        وقتی کاربر درخواست نمایش محصولات کرد، حتما باید پاسخ را با HTML ساده بدهی.
                        برای هر محصول یک کارت HTML بساز که شامل تصویر، عنوان، توضیح کوتاه و قیمت باشد.
                        از تگ <img src=\"...\" width=\"100\" style=\"display:block;margin:0 auto;\" alt=\"...\" /> استفاده کن.
                        آدرس تصویر را حتما از فیلد `image` محصولات بگیر و از لینک‌های کامل HTTP یا HTTPS استفاده کن.
                        از `src=\"src\"` یا عکس‌های placeholder استفاده نکن.
                        اگر فقط سوال عمومی است، می‌توانی پاسخ را به صورت متن ساده با خطوط جدید بدهی.
                        مهم است که وقتی کاربر خواست محصولات را ببیند، تصویر هر محصول را هم همراه متن ارسال کنی.
                    """
                },
                *self.conversation_history   ,
                *self.othersLearnings
            ]
        )

        ai_response = response.choices[0].message.content

        ai_response= ai_response.replace("<3","❤️")
        self.conversation_history.append({
            "role": "assistant",
            "content": ai_response
        })

        return ai_response , self.conversation_history
    
