# Подключение Telegram

1. Откройте @BotFather → /newbot → создайте бота → скопируйте токен.
2. Откройте созданного бота и нажмите Start.
3. В Vercel → проект → Settings → Environment Variables добавьте:
   - TELEGRAM_BOT_TOKEN — токен BotFather.
   - TELEGRAM_CHAT_ID — ID личного чата или группы.
4. Выберите Production (и Preview, если нужно), сохраните.
5. Сделайте Redeploy.
6. Отправьте пробную заявку с сайта.

Chat ID: после /start откройте https://api.telegram.org/botTOKEN/getUpdates и найдите message.chat.id. Токен в ссылке никому не показывайте.

Бот отправляет в Telegram имя, страну, номер телефона, выбранный тур, сообщение и номер заявки. Токен хранится только в Vercel Environment Variables, не в коде.
