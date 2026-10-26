# Travel Horizon

Статический сайт `public/index.html` + серверная функция `api/booking.js` (заявки → Telegram).

## Локальный запуск
`npm i -g vercel`, затем `vercel dev`. Создайте локальный `.env` по образцу `.env.example` (он в `.gitignore`, не коммитить).

## Публикация (GitHub → Vercel)
1. Создайте пустой репозиторий на GitHub и выполните в папке проекта:
   `git init && git add . && git commit -m "feat: Travel Horizon" && git branch -M main && git remote add origin URL && git push -u origin main`
2. Vercel → **Add New → Project** → выберите репозиторий. Сборка не нужна, `vercel.json` указывает папку `public`.
3. Добавьте переменные (`docs/TELEGRAM_SETUP.md`), сделайте Redeploy. Далее push в `main` = production, другие ветки = preview.

## Как менять содержимое (всё в `public/index.html`)
- **Туры, цены, маршруты:** массив `TR` (цена — 5-е поле каждого тура). Цены демонстрационные.
- **Направления и координаты карты:** массив `D`. Карта строится из `D` и `TR`, расхождений быть не должно.
- **Фотографии:** объект `IMG`, например `IMG.ik='https://…/issyk-kul.jpg'`. Используйте снимки с лицензией (Wikimedia Commons, Unsplash) и указывайте авторов. Без URL показывается иллюстрация.
- **Переводы:** объект `T`.
- **Список туров на сервере:** `TOURS` в `api/booking.js` должен совпадать с `TR`.

## Ограничения
- Лимит запросов и защита от дублей хранятся в памяти экземпляра функции. Для строгой защиты подключите Upstash Redis или Vercel KV.
- Переведены 4 языка (EN, RU, KY, ES); IT, ZH, JA, FR не добавлены.
