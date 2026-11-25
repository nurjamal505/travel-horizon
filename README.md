# Travel Horizon

Адаптивный туристический сайт о Кыргызстане. Публикация из корня репозитория через Vercel.

## Функции
- Главная, направления, туры, фильтры, планировщик, FAQ и карта Leaflet.
- Четыре языка: русский, английский, кыргызский и испанский.
- Фотографии автоматически ищутся в Wikimedia Commons; при отсутствии подходящего фото показывается встроенная иллюстрация.
- Карта использует Leaflet/OpenStreetMap и загружает GeoJSON областей из `data/kyrgyzstan-regions.geojson`.
- Короткая форма заявки: имя, страна, телефон, сообщение. Выбранный тур прикрепляется автоматически.
- `/admin/` — защищённая панель заявок (нужны Supabase Auth и таблица admins).

## Telegram за 2 минуты
1. В Telegram откройте @BotFather, отправьте `/newbot`, создайте бота и скопируйте токен.
2. Откройте своего бота и нажмите **Start**.
3. В Vercel → Project → Settings → Environment Variables добавьте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` для Production.
4. Нажмите Redeploy.
5. Отправьте тестовую заявку на сайте. Токен никогда не добавляйте в HTML, GitHub или ZIP.

Chat ID можно получить после /start через `https://api.telegram.org/botTOKEN/getUpdates`, найдя `message.chat.id`. Не публикуйте ссылку с токеном.

## Supabase и админка
1. Создайте проект на supabase.com.
2. Выполните `supabase/schema.sql` в SQL Editor.
3. В Authentication → Users создайте пользователя админки.
4. Выполните: `insert into public.admins (user_id) values ('UUID-ПОЛЬЗОВАТЕЛЯ');`
5. Добавьте в Vercel `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
6. Сделайте Redeploy и войдите на `/admin/`.

Service role key хранить только в секретных переменных Vercel.

## Локально
`npm install`, затем `npm run dev` (нужен Vercel CLI). Для локальных секретов используйте .env.local, не коммитьте его.
