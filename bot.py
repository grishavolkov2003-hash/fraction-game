import os
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, MenuButtonWebApp
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

TOKEN = os.environ["BOT_TOKEN"]
WEBAPP_URL = "https://fraction-game.serveousercontent.com"


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton("🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))]]
    await update.message.reply_text(
        "Привет! Это тренажёр дробей.\n\nЗдесь можно тренировать сложение, умножение, деление и сокращение дробей. Два уровня сложности, таймер и очки.\n\nНажми кнопку ниже 👇",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def post_init(app):
    await app.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="Играть", web_app=WebAppInfo(url=WEBAPP_URL))
    )


app = ApplicationBuilder().token(TOKEN).post_init(post_init).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
