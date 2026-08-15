АРХИТЕКТУРА SMART NOTES SYSTEM
Версия 0.4.0

Этот файл - точка входа в проект для разработчиков и LLM-агентов.

ОБЗОР
Smart Notes - многопользовательское веб-приложение для создания,
поиска и управления заметками.

Стек:
- Backend: Node.js + Fastify (CommonJS)
- Frontend: React 18 + Vite
- Database: PostgreSQL 16
- Search: Typesense 27
- Auth: JWT + bcryptjs

СТРУКТУРА ПРОЕКТА
notes-app/
  backend/
    src/
      core/
        server.js - точка входа, подключает модули
        db.js - пул PostgreSQL, миграции
        events.js - EventBus (шина событий)
        auth-middleware.js - проверка JWT
      modules/
        auth/ - регистрация, вход, выдача JWT
        notes/ - CRUD заметок
        search/ - поиск через Typesense
  frontend/
    src/
      main.jsx - точка входа React
      App.jsx - главный компонент
      styles/global.css - все стили
  docker-compose.yml - PostgreSQL и Typesense

BACKEND (ЯДРО)
server.js - запускает Fastify, вызывает initSchema, подключает модули.
db.js - экспортирует query() и initSchema(). Модули не знают строку подключения.
events.js - EventBus. Методы on() и emit().
auth-middleware.js - проверяет заголовок Authorization, верифицирует JWT.

МОДУЛИ BACKEND
Каждый модуль - папка в backend/src/modules/имя/index.js

Правила:
1. Модуль не знает о других модулях.
2. Модуль экспортирует функцию function(module, opts, done).
3. Внутри определяются роуты (app.get, app.post).
4. Защита роутов: preHandler: authMiddleware.
5. Модуль может подписываться на события через EventBus.on().

Как добавить новый модуль:
1. Создай папку backend/src/modules/имя/index.js.
2. Напиши роуты.
3. Подключи в core/server.js через app.register(module).

ТЕКУЩИЕ МОДУЛИ
auth: POST /auth/register, POST /auth/login (без защиты)
notes: GET /notes, POST /notes, DELETE /notes/:id (с защитой)
search: GET /search?q= (с защитой)

БАЗА ДАННЫХ
Таблица users:
id, username (unique), password_hash, created_at

Таблица notes:
id, user_id (FK на users), title, content, tags (массив), created_at

Связь: один пользователь - много заметок.

ПОИСК (TYPESENSE)
Модуль search слушает события:
note:created - индексирует заметку
note:deleted - удаляет из индекса

Поиск: GET /search?q=текст
Фильтр: только заметки текущего пользователя (user_id)

FRONTEND
App.jsx содержит всю логику:
- Авторизация (логин/регистрация)
- Загрузка заметок
- Поиск
- Сортировка (date_desc, date_asc, title_asc)
- Модальное окно добавления
- Удаление

Токен хранится в localStorage (ключ token).
Все запросы к API отправляют заголовок Authorization: Bearer токен.
Функция getHeaders() формирует заголовки.

Vite проксирует /api/* на http://127.0.0.1:3333/*

ДИЗАЙН
Фон: #1a1a1a (Black 85%)
Акцент: #E35205 (Pantone 166C)
Стиль: Glassmorphism + Dark Theme

GIT FLOW
Feat: описание - новая функция
Fix: описание - исправление
Refactor: описание - переделка
Docs: описание - документация

ПЛАН РАЗВИТИЯ
[x] Модульная архитектура
[x] Парсер тегов
[x] Поиск
[x] Авторизация
[x] Привязка заметок к пользователям
[ ] Дебаунс поиска
[ ] Шаринг заметок
[ ] Комментарии
[ ] Версионирование

ЗАПУСК
Инфраструктура: docker compose up -d
Backend: cd backend && npm start (порт 3333)
Frontend: cd frontend && npm run dev (порт 5173)

LLM-ИНСТРУКЦИЯ
Если ты ИИ и работаешь с этим проектом:
1. Прочитай этот файл.
2. Не меняй core/ без необходимости.
3. Новые фичи добавляй как модули.
4. Оформляй изменения коммитами.
