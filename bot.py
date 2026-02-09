import asyncio
import json
import logging
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import WebAppInfo, MenuButtonWebApp, InlineKeyboardMarkup, InlineKeyboardButton

# ==================== НАСТРОЙКИ ====================

# Получаем из переменных окружения или используем тестовые
BOT_TOKEN = os.getenv('BOT_TOKEN', '8591299588:AAFAEPgoMdcCu-PcGM9jGJny1-NS1RJg3gQ')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://sevastsyanmatus-pixel.github.io/artholst-shop/')
ADMIN_CHAT_ID = int(os.getenv('ADMIN_CHAT_ID', '6358403376'))

print(f"🔧 Bot Token: {BOT_TOKEN[:10]}...")
print(f"🔧 WebApp URL: {WEBAPP_URL}")
print(f"🔧 Admin ID: {ADMIN_CHAT_ID}")

# ==================== ИНИЦИАЛИЗАЦИЯ ====================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ==================== ОБРАБОТЧИКИ ====================

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Команда /start"""
    
    logger.info(f"Start command from user {message.from_user.id}")
    
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
    
    welcome_text = f"""
🎨 <b>Добро пожаловать в ARTHOLST!</b>

Ваш ID: <code>{message.from_user.id}</code>
Admin ID: <code>{ADMIN_CHAT_ID}</code>

Нажмите кнопку ниже, чтобы открыть магазин!
    """
    
    await message.answer(welcome_text, parse_mode="HTML", reply_markup=keyboard)


@dp.message(Command("test"))
async def cmd_test(message: types.Message):
    """Тестовая команда для проверки"""
    
    logger.info(f"Test command from {message.from_user.id}")
    
    # Пробуем отправить тестовое сообщение админу
    try:
        await bot.send_message(
            ADMIN_CHAT_ID,
            f"✅ Тестовое сообщение!\nОт пользователя: {message.from_user.id}"
        )
        await message.answer("✅ Тестовое сообщение отправлено админу!")
    except Exception as e:
        await message.answer(f"❌ Ошибка отправки админу: {e}")
        logger.error(f"Error sending to admin: {e}")


@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    """Обработка данных из WebApp"""
    
    logger.info(f"📦 Received WebApp data from {message.from_user.id}")
    
    try:
        # Парсим данные
        data = json.loads(message.web_app_data.data)
        logger.info(f"📦 Order data: {data}")
        
        order_id = data.get('orderId', 'N/A')
        order_message = data.get('message', '')
        total = data.get('total', 0)
        
        # Отправляем админу
        logger.info(f"Sending order {order_id} to admin {ADMIN_CHAT_ID}")
        
        try:
            await bot.send_message(
                chat_id=ADMIN_CHAT_ID,
                text=order_message or f"🎨 Новый заказ #{order_id}\n\nСумма: {total} BYN"
            )
            logger.info("✅ Order sent to admin successfully")
        except Exception as e:
            logger.error(f"❌ Error sending to admin: {e}")
            await message.answer(f"❌ Ошибка отправки админу: {e}")
            return
        
        # Подтверждение клиенту
        confirmation = f"""
✅ <b>Заказ #{order_id} принят!</b>

Сумма: {total:.2f} BYN
Предоплата: {total/2:.2f} BYN

📱 Отправьте фото менеджеру: @oformitszakaz
        """
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📱 Написать менеджеру",
                url="https://t.me/oformitszakaz"
            )]
        ])
        
        await message.answer(confirmation, parse_mode="HTML", reply_markup=keyboard)
        
    except Exception as e:
        logger.error(f"❌ Error processing order: {e}")
        await message.answer(f"❌ Ошибка обработки заказа: {e}")


@dp.message(Command("id"))
async def cmd_id(message: types.Message):
    """Показать ID пользователя"""
    await message.answer(
        f"👤 Ваш ID: <code>{message.from_user.id}</code>\n"
        f"📋 Admin ID: <code>{ADMIN_CHAT_ID}</code>",
        parse_mode="HTML"
    )


@dp.message()
async def echo(message: types.Message):
    """Эхо сообщений"""
    logger.info(f"Message from {message.from_user.id}: {message.text}")
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🎨 Открыть магазин",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )]
    ])
    
    await message.answer(
        "Используйте кнопку для открытия магазина:",
        reply_markup=keyboard
    )


# ==================== ЗАПУСК ====================

async def on_startup():
    """При запуске"""
    logger.info(f"✅ Bot started! Admin ID: {ADMIN_CHAT_ID}")
    
    try:
        await bot.send_message(
            ADMIN_CHAT_ID,
            f"✅ Бот запущен и готов принимать заказы!\n\n"
            f"WebApp URL: {WEBAPP_URL}\n"
            f"Admin ID: {ADMIN_CHAT_ID}"
        )
    except Exception as e:
        logger.error(f"Cannot send startup message to admin: {e}")
    
    # Устанавливаем кнопку меню
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🎨 Магазин",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
        logger.info("✅ Menu button set")
    except Exception as e:
        logger.error(f"Error setting menu button: {e}")


async def main():
    """Главная функция"""
    dp.startup.register(on_startup)
    logger.info("Starting bot...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped")
