АРХИТЕКТУРА SMART NOTES SYSTEM
Версия 0.4.0
Дата: 2026-08-16

========================================
СОДЕРЖАНИЕ
========================================
1. Обзор системы
2. Технологический стек
3. Структура проекта
4. Backend (подробно)
5. Frontend (подробно)
6. База данных
7. Поиск (Typesense)
8. Авторизация
9. Дизайн-система
10. Взаимодействие модулей
11. API Endpoints
12. Запуск и развертывание
13. Git Flow
14. План развития
15. Инструкция для LLM

========================================
1. ОБЗОР СИСТЕМЫ
========================================
Smart Notes - многопользовательское веб-приложение для создания,
хранения и поиска заметок. Разработано для использования в страховой
компании (системный аналитик и коллеги).

Основные возможности:
- Регистрация и авторизация пользователей (JWT)
- Создание, просмотр, удаление заметок
- Автоматическое распознавание тегов (#тег в тексте)
- Полнотекстовый поиск по заметкам (Typesense)
- Сортировка по дате и алфавиту
- Привязка заметок к конкретному пользователю

========================================
2. ТЕХНОЛОГИЧЕСКИЙ СТЕК
========================================
Backend:
- Node.js 18+
- Fastify (веб-фреймворк)
- pg (драйвер PostgreSQL)
- typesense (клиент поискового движка)
- jsonwebtoken (JWT)
- bcryptjs (хеширование паролей)

Frontend:
- React 18
- Vite (сборщик)
- CSS (чистый, без фреймворков)

Инфраструктура:
- PostgreSQL 16 (Docker)
- Typesense 27 (Docker)
- Docker Compose

========================================
3. СТРУКТУРА ПРОЕКТА
========================================
notes-app/
  docker-compose.yml
  README.md
  ARCHITECTURE.md
  backend/
    package.json
    node_modules/
    src/
      core/
        server.js
        db.js
        events.js
        auth-middleware.js
      modules/
        auth/
          index.js
        notes/
          index.js
        search/
          index.js
  frontend/
    package.json
    node_modules/
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx
      styles/
        global.css

========================================
4. BACKEND (ПОДРОБНО)
========================================
Backend построен на модульной архитектуре. Ядро (core) предоставляет
базовые сервисы, модули (modules) реализуют бизнес-логику.

4.1 ЯДРО (CORE)

server.js
- Точка входа в приложение
- Создает экземпляр Fastify с логированием
- Вызывает db.initSchema() для миграций
- Подключает модули через app.register()
- Запускает сервер на 0.0.0.0:3333
- Эмитит событие server:started

db.js
- Создает пул соединений PostgreSQL
- Экспортирует query(text, params) для SQL-запросов
- Экспортирует initSchema() для миграций
- Миграции: создает таблицы users и notes, добавляет колонку user_id
- Все модули используют db.query(), не зная деталей подключения

events.js
- Реализует паттерн Observer (EventBus)
- Экспортирует синглтон (один экземпляр на всё приложение)
- Методы: on(event, callback), emit(event, data)
- Используется для связи модулей без прямых зависимостей

auth-middleware.js
- Проверяет заголовок Authorization
- Верифицирует JWT (секрет: super-secret-key-change-me)
- Добавляет request.user (объект с id и username)
- Отклоняет запросы без токена (401)

4.2 МОДУЛИ

Каждый модуль - папка в src/modules/имя/index.js

СТРУКТУРА МОДУЛЯ:
function moduleName(app, opts, done) {
  // роуты
  app.get('/path', { preHandler: authMiddleware }, handler);
  // подписки на события
  EventBus.on('event', callback);
  done();
}
module.exports = moduleName;

МОДУЛЬ AUTH (авторизация)
Файл: src/modules/auth/index.js

Роуты:
POST /auth/register - регистрация
  Принимает: username, password
  Хеширует пароль (bcrypt, 10 раундов)
  Сохраняет в таблицу users
  Возвращает: id, username

POST /auth/login - вход
  Принимает: username, password
  Проверяет существование пользователя
  Сравнивает хеш пароля
  Выдает JWT (срок 7 дней)
  Возвращает: token, user

Зависимости: db (ядро), bcryptjs, jsonwebtoken

МОДУЛЬ NOTES (заметки)
Файл: src/modules/notes/index.js

Функции:
extractTags(text) - извлекает #теги из текста
cleanContent(text) - убирает теги из контента

Роуты:
GET /notes (защищен)
  Возвращает заметки только текущего пользователя
  Сортировка: created_at DESC

POST /notes (защищен)
  Принимает: title, content
  Парсит теги из контента
  Сохраняет с user_id текущего пользователя
  Эмитит событие note:created

DELETE /notes/:id (защищен)
  Удаляет только свою заметку (проверка user_id)
  Эмитит событие note:deleted

Зависимости: db, events, auth-middleware

МОДУЛЬ SEARCH (поиск)
Файл: src/modules/search/index.js

Функции:
ensureCollection() - создает коллекцию в Typesense если нет
upsertNote(note) - индексирует/обновляет заметку
removeNote(id) - удаляет из индекса

Роуты:
GET /search?q= (защищен)
  Ищет по полям: title, content, tags
  Фильтр: user_id текущего пользователя
  Сортировка: created_at DESC

Подписки:
EventBus.on('note:created', upsertNote)
EventBus.on('note:deleted', removeNote)

Зависимости: db, events, auth-middleware, typesense

========================================
5. FRONTEND (ПОДРОБНО)
========================================
Frontend - одностраничное приложение (SPA) на React.

5.1 ФАЙЛЫ

main.jsx
- Точка входа
- Рендерит App в #root
- Импортирует global.css

App.jsx
- Главный компонент (вся логика)
- Состояния: авторизация, заметки, поиск, модалка
- Функции: loadNotes, handleAuth, handleSearch, handleSubmit, handleDelete
- Условный рендер: экран логина или основное приложение

global.css
- Все стили приложения
- CSS-переменные для цветов
- Компоненты: auth, header, search, sort, list, detail, modal

5.2 АВТОРИЗАЦИЯ НА ФРОНТЕ
- Токен хранится в localStorage (ключ token)
- При старте проверяется наличие токена
- Если токена нет - показывается экран логина
- После входа - основное приложение
- Кнопка "Выйти" удаляет токен

5.3 ЗАПРОСЫ К API
Функция getHeaders() добавляет заголовок Authorization.
Все fetch-запросы используют эту функцию.

5.4 VITE PROXY
Vite проксирует /api/* на http://127.0.0.1:3333/*
Это позволяет использовать относительные URL (/api/notes).

========================================
6. БАЗА ДАННЫХ
========================================
Таблица users:
- id: SERIAL PRIMARY KEY
- username: TEXT UNIQUE NOT NULL
- password_hash: TEXT NOT NULL
- created_at: TIMESTAMPTZ DEFAULT NOW()

Таблица notes:
- id: SERIAL PRIMARY KEY
- user_id: INTEGER REFERENCES users(id) ON DELETE CASCADE
- title: TEXT NOT NULL
- content: TEXT
- tags: TEXT[] DEFAULT '{}'
- created_at: TIMESTAMPTZ DEFAULT NOW()

Связь: users (1) -> (N) notes
При удалении пользователя - каскадное удаление заметок.

========================================
7. ПОИСК (TYPESENSE)
========================================
Коллекция: notes
Поля:
- title (string)
- content (string)
- tags (string[], facet)
- created_at (int64)
- user_id (int64)

Синхронизация:
- Создание заметки -> EventBus -> upsertNote -> Typesense
- Удаление заметки -> EventBus -> removeNote -> Typesense

Поиск:
- Запрос: GET /search?q=текст
- Поиск по: title, content, tags
- Фильтр: user_id = текущий пользователь
- Сортировка: created_at DESC

========================================
8. АВТОРИЗАЦИЯ
========================================
Процесс:
1. Регистрация: хеширование пароля (bcrypt), сохранение в БД
2. Вход: проверка пароля, выдача JWT
3. JWT содержит: id, username
4. Срок действия: 7 дней
5. Каждый защищенный запрос проверяет JWT через middleware

Секрет: super-secret-key-change-me (нужно сменить в продакшене)

========================================
9. ДИЗАЙН-СИСТЕМА
========================================
Цвета:
- Фон: #1a1a1a (Black 85%)
- Акцент: #E35205 (Pantone 166C)
- Акцент hover: #ff6a1a
- Поверхности: rgba(255,255,255,0.03-0.08)
- Текст основной: #f5f5f5
- Текст вторичный: #a3a3a3
- Опасность: #ff4d4d

Типографика:
- Шрифт: Inter (Google Fonts)
- Размеры: 13-32px
- Заголовки: 600-700 weight

Стиль:
- Glassmorphism (backdrop-filter: blur)
- Скругления: 12-16px
- Тени: мягкие, глубокие
- Анимации: transform, transition

Компоненты:
- auth-box (экран входа)
- app-header (шапка)
- search-input (поиск)
- sort-bar (сортировка)
- notes-list (список)
- note-card (карточка)
- note-detail (просмотр)
- modal (добавление)

========================================
10. ВЗАИМОДЕЙСТВИЕ МОДУЛЕЙ
========================================
Схема событий:

Пользователь создает заметку:
Frontend (App.jsx) 
  -> POST /api/notes 
  -> Backend notes.js 
  -> db.query(INSERT) 
  -> EventBus.emit('note:created', note) 
  -> search.js upsertNote(note) 
  -> Typesense

Пользователь удаляет заметку:
Frontend 
  -> DELETE /api/notes/:id 
  -> Backend notes.js 
  -> db.query(DELETE) 
  -> EventBus.emit('note:deleted', id) 
  -> search.js removeNote(id) 
  -> Typesense

Пользователь ищет:
Frontend 
  -> GET /api/search?q=текст 
  -> Backend search.js 
  -> Typesense.search() 
  -> Возврат результатов

========================================
11. API ENDPOINTS
========================================
Без авторизации:
GET /health - проверка жизни
POST /auth/register - регистрация
POST /auth/login - вход

С авторизацией (JWT):
GET /notes - список заметок
POST /notes - создание
DELETE /notes/:id - удаление
GET /search?q= - поиск

========================================
12. ЗАПУСК И РАЗВЕРТЫВАНИЕ
========================================
Инфраструктура:
docker compose up -d

Backend:
cd backend
npm install
npm start

Frontend:
cd frontend
npm install
npm run dev

Адреса:
API: http://localhost:3333
Web: http://localhost:5173

========================================
13. GIT FLOW
========================================
Формат коммитов:
Feat: описание - новая функция
Fix: описание - исправление
Refactor: описание - переделка
Docs: описание - документация

========================================
14. ПЛАН РАЗВИТИЯ
========================================
[x] Модульная архитектура
[x] Парсер тегов (#тег)
[x] Поиск (Typesense)
[x] Авторизация (JWT)
[x] Привязка заметок к пользователям
[ ] Дебаунс поиска
[ ] Шаринг заметок
[ ] Комментарии
[ ] Версионирование изменений
[ ] Восстановление пароля
[ ] Пагинация

========================================
15. ИНСТРУКЦИЯ ДЛЯ LLM
========================================
Если ты ИИ и работаешь с этим проектом:
1. Прочитай этот файл полностью.
2. Не меняй core/ без явной необходимости.
3. Новые фичи добавляй как модули (Backend) или компоненты (Frontend).
4. Соблюдай правила модулей (раздел 4.2).
5. Все изменения оформляй коммитами.
6. После изменений тестируй через curl или браузер.
7. Помни: заметки привязаны к пользователям через user_id.
8. Поиск синхронизируется через EventBus (не напрямую).
