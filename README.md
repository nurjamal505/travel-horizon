# Travel Horizon

Сайт публикуется из корня репозитория через Vercel. Основные части:
- `index.html` — публичный сайт (EN/RU/KY/ES), интерактивная карта, автоматическая загрузка фото Wikimedia Commons.
- `api/booking.js` — проверка заявок, отправка в Telegram и необязательное сохранение в Supabase.
- `admin/index.html` + `api/admin.js` — защищённая панель заявок: `/admin/`.
- `supabase/schema.sql` — таблицы для базы данных.

## Vercel

Добавьте переменные в Settings → Environment Variables:

| Переменная | Назначение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Секретный токен Telegram-бота |
| `TELEGRAM_CHAT_ID` | ID чата, куда приходят заявки |
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_ANON_KEY` | Публичный ключ Supabase для проверки пользовательской сессии |
| `SUPABASE_SERVICE_ROLE_KEY` | Секретный service role key, только серверная переменная |

После добавления переменных сделайте Redeploy. Не помещайте токены и service role key в HTML, JavaScript браузера или GitHub.

## Настройка базы и администратора

1. Создайте проект Supabase.
2. В SQL Editor выполните `supabase/schema.sql`.
3. В Supabase Authentication → Users создайте пользователя администратора с email и паролем.
4. Скопируйте UUID пользователя и выполните SQL, заменив UUID:

```sql
insert into public.admins (user_id) values ('UUID-ПОЛЬЗОВАТЕЛЯ');
```

5. Добавьте переменные Supabase в Vercel и выполните Redeploy.
6. Откройте `https://ВАШ-ДОМЕН/admin/` и войдите созданным email и паролем.

Админ API проверяет JWT через Supabase Auth и сверяет UUID пользователя с таблицей `admins`. Таблицы не открыты для анонимного доступа. Service role key используется только сервером.

## Локальная разработка

Установите Node.js и Vercel CLI, затем выполните `vercel dev`. Локальные секреты держите в `.env.local`, не коммитьте их.

## Фото и карта

Фотографии ищутся по названиям мест в Wikimedia Commons во время загрузки сайта. Это зависит от доступности Commons и качества результатов; если фото не найдено, показывается встроенная иллюстрация. Карта использует Leaflet/OpenStreetMap и загружает административные границы из geoBoundaries. Позиции туристических маркеров ориентировочные.

Цены в каталоге являются демонстрационными и не подтверждают наличие туров.

## Deploy on Vercel

Connect this repository to Vercel and select the `vercel-site-upgrade` branch for the preview deployment. Use the repository root as the Root Directory and the `Other` framework preset. The public website and serverless API must be served from the same Vercel project/domain.

Set these Environment Variables in Vercel (Production and Preview as needed):
- `TELEGRAM_BOT_TOKEN` — bot token from BotFather (secret).
- `TELEGRAM_CHAT_ID` — destination chat ID. Open the bot chat and send `/start` before testing.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server-side only.

Run `supabase/schema.sql` in the Supabase SQL Editor. Create an Auth user, then add its UUID to `public.admins`:
```sql
insert into public.admins(user_id) values ('YOUR-AUTH-USER-UUID');
```
Redeploy after changing environment variables. Open `https://YOUR-VERCEL-DOMAIN/admin/`, sign in, and use **Проверить Telegram** to send a test message. A real booking is stored in Supabase before Telegram notification; if Telegram is down, the API reports the notification failure rather than silently claiming delivery.

GitHub Pages cannot execute `/api/*.js`. Use the Vercel deployment as the canonical site if booking and admin features are required.
