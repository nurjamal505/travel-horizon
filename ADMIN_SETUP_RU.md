# Travel Horizon: админ-панель и заявки

## Адрес админ-панели

Откройте `https://travel-horizon-eta.vercel.app/admin/` (или адрес вашего актуального Production deployment + `/admin/`).

## Вход

Используется один пароль администратора, хранящийся только в переменной Vercel `ADMIN_PASSWORD`. Секрет сессии хранится в `ADMIN_SESSION_SECRET`. Пароль не записывается в GitHub и не отправляется в браузер как переменная окружения. Сессия ставится в Secure, HttpOnly cookie.

Чтобы сменить пароль: Vercel → Project → Settings → Environment Variables → `ADMIN_PASSWORD` → Edit → сохранить → Redeploy Production.

## Заявки

Форма сайта отправляет заявку в `/api/booking`. Сервер отправляет уведомление в Telegram и сохраняет зашифрованную запись в Vercel Blob. Админка позволяет просматривать заявки и менять статус: новая, связались, подтверждена, отменена.

## Фотографии

В админке есть блок «Фотографии мест». Поддерживаются JPG, PNG, WebP, AVIF до 4 МБ. Загруженные файлы сохраняются в подключённом Vercel Blob store `travel-horizon-media`. Автоматический поиск фотографий достопримечательностей на сайте использует Wikimedia Commons и показывает сведения об авторе и лицензии.

## Переменные Vercel

- `TELEGRAM_BOT_TOKEN`: токен от @BotFather (секрет).
- `TELEGRAM_CHAT_ID`: ID чата, куда слать заявки.
- `ADMIN_PASSWORD`: пароль админки (секрет).
- `ADMIN_SESSION_SECRET`: случайный секрет для подписи сессии и шифрования заявок.
- `BLOB_READ_WRITE_TOKEN`: автоматически добавлен подключённым Blob store.

Не помещайте секреты в HTML, JavaScript браузера или GitHub.

## Диагностика

Откройте `/api/health`: endpoint сообщает, настроены ли Telegram, админка и Blob, проверяет доступность Telegram bot/chat и не раскрывает секреты.
