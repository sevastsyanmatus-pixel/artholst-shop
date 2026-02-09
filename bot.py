"""
ARTHOLST Telegram Bot
Получение заказов из Mini App
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import WebAppInfo, MenuButtonWebApp, InlineKeyboardMarkup, InlineKeyboardButton

# ==================== НАСТРОЙКИ ====================

# Получаем данные из переменных окружения GitHub Secrets
BOT_TOKEN = os.getenv('BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://ВАШ_ЮЗЕРНЕЙМ.github.io/ВАШ_РЕПОЗИТОРИЙ/')
ADMIN_CHAT_ID = int(os.getenv('ADMIN_CHAT_ID', '123456789'))

# ==================== ИНИЦИАЛИЗАЦИЯ ====================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ==================== ОБРАБОТЧИКИ ====================

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Команда /start - приветствие и кнопка магазина"""
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🎨 Открыть магазин",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )],
        [InlineKeyboardButton(
            text="📱 Написать менеджеру",
            url="https://t.me/oformitszakaz"
        )]
    ])
    
    welcome_text = """
🎨 <b>Добро пожаловать в ARTHOLST!</b>

Мы печатаем ваши фотографии на натуральном холсте.

✨ <b>Наши преимущества:</b>
• Натуральный хлопковый холст
• Гарантия 100+ лет
• Изготовление 1-3 дня
• Бесплатная доставка от 200 BYN

Нажмите кнопку ниже, чтобы выбрать размер и оформить заказ! 👇
    """
    
    await message.answer(
        welcome_text,
        parse_mode="HTML",
        reply_markup=keyboard
    )


@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    """Обработка данных из Mini App (заказ)"""
    
    try:
        data = json.loads(message.web_app_data.data)
        
        order_id = data.get('orderId', 'N/A')
        order_message = data.get('message', '')
        total = data.get('total', 0)
        
        logger.info(f"Новый заказ #{order_id}")
        
        # Отправляем заказ администратору
        await bot.send_message(
            chat_id=ADMIN_CHAT_ID,
            text=order_message,
            parse_mode=None
        )
        
        # Подтверждение клиенту
        confirmation_text = f"""
✅ <b>Ваш заказ #{order_id} принят!</b>

Спасибо за заказ в ARTHOLST! 🎨

📋 <b>Следующие шаги:</b>
1. Отправьте фото для печати менеджеру
2. Мы подготовим макет и покажем вам
3. После согласования — оплата 50% предоплаты
4. Изготовление 1-3 дня
5. Доставка или самовывоз

💬 Напишите менеджеру, чтобы отправить фото:
👉 @oformitszakaz

💰 <b>Сумма заказа:</b> {total:.2f} BYN
💳 <b>Предоплата:</b> {total/2:.2f} BYN
        """
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📱 Отправить фото менеджеру",
                url="https://t.me/oformitszakaz"
            )],
            [InlineKeyboardButton(
                text="🛍 Новый заказ",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )]
        ])
        
        await message.answer(
            confirmation_text,
            parse_mode="HTML",
            reply_markup=keyboard
        )
        
    except Exception as e:
        logger.error(f"Ошибка обработки заказа: {e}")
        await message.answer("❌ Произошла ошибка. Свяжитесь с менеджером: @oformitszakaz")


@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    """Команда /help"""
    
    help_text = """
📖 <b>Помощь по боту ARTHOLST</b>

<b>Как сделать заказ:</b>
1. Нажмите "Открыть магазин"
2. Выберите размеры картин
3. Добавьте в корзину
4. Оформите заказ
5. Отправьте фото менеджеру

<b>Контакты:</b>
📱 Менеджер: @oformitszakaz
📸 Instagram: @artholst_belarus
    """
    
    await message.answer(help_text, parse_mode="HTML")


@dp.message()
async def echo_handler(message: types.Message):
    """Обработчик всех остальных сообщений"""
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🎨 Открыть магазин",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )]
    ])
    
    await message.answer(
        "Используйте кнопку ниже для оформления заказа:",
        reply_markup=keyboard
    )


# ==================== ЗАПУСК ====================

async def set_menu_button():
    """Установка кнопки меню WebApp"""
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="🎨 Магазин",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    )


async def on_startup():
    """При запуске бота"""
    await set_menu_button()
    logger.info("✅ Бот ARTHOLST успешно запущен!")
    
    try:
        await bot.send_message(
            ADMIN_CHAT_ID,
            "✅ Бот ARTHOLST успешно запущен!\n\nГотов принимать заказы."
        )
    except:
        pass


async def main():
    """Главная функция"""
    logger.info("Запуск бота ARTHOLST...")
    dp.startup.register(on_startup)
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Бот остановлен")
