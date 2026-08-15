# SMART NOTES SYSTEM - ПОЛНАЯ ДОКУМЕНТАЦИЯ

Версия: 0.5.0
Дата обновления: 2026-08-16

========================================
ОГЛАВЛЕНИЕ
========================================
1. Обзор проекта
2. Технологический стек
3. Структура проекта
4. Backend (подробно)
5. Frontend (подробно)
6. База данных
7. Поиск (Typesense)
8. Авторизация (JWT)
9. Редактор текста (TipTap)
10. Дизайн-система
11. Взаимодействие модулей
12. API Endpoints
13. Запуск и развертывание
14. Git Flow
15. Текущие проблемы и TODO
16. Инструкция для LLM

========================================
1. ОБЗОР ПРОЕКТА
========================================
Smart Notes - многопользовательское веб-приложение для создания,
хранения, поиска и редактирования заметок.

Основные возможности:
- Регистрация и авторизация (JWT)
- Создание, чтение, обновление, удаление заметок (CRUD)
- WYSIWYG-редактор с поддержкой кода
- Автоматическое распознавание тегов (#тег)
- Полнотекстовый поиск (Typesense)
- Облако тегов с фильтрацией
- Сортировка (по дате, алфавиту)
- Привязка заметок к пользователям
- Адаптивный тёмный интерфейс

========================================
2. ТЕХНОЛОГИЧЕСКИЙ СТЕК
========================================
Backend:
- Node.js 18+
- Fastify 4 (веб-фреймворк)
- pg (драйвер PostgreSQL)
- typesense (клиент поиска)
- jsonwebtoken (JWT)
- bcryptjs (хеширование паролей)

Frontend:
- React 18
- Vite 5 (сборщик)
- TipTap (WYSIWYG-редактор)
- lowlight (подсветка синтаксиса)
- CSS (чистый, без фреймворков)

Инфраструктура:
- PostgreSQL 16 (Docker)
- Typesense 27 (Docker)
- Docker Compose

========================================
3. СТРУКТУРА ПРОЕКТА
========================================
notes-app/
├── docker-compose.yml          # PostgreSQL + Typesense
├── README.md                   # Краткое описание
├── ARCHITECTURE.md             # Этот файл
├── backend/
│   ├── package.json
│   ├── node_modules/
│   └── src/
│       ├── core/
│       │   ├── server.js       # Точка входа
│       │   ├── db.js           # Пул PostgreSQL
│       │   ├── events.js       # EventBus
│       │   └── auth-middleware.js # JWT проверка
│       └── modules/
│           ├── auth/           # Регистрация, вход
│           ├── notes/          # CRUD заметок
│           ├── tags/           # Статистика тегов
│           └── search/         # Поиск Typesense
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx            # Точка входа React
        ├── App.jsx             # Главный компонент
        └── styles/
            └── global.css      # Все стили

========================================
4. BACKEND (ПОДРОБНО)
========================================

4.1 ЯДРО (CORE)

server.js
- Создает экземпляр Fastify
- Вызывает db.initSchema() (миграции)
- Подключает модули через app.register()
- Запускает на 0.0.0.0:3333
- Эмитит server:started

db.js
- Пул PostgreSQL (pg.Pool)
- query(text, params) - выполнение SQL
- initSchema() - создание таблиц и колонок
- Конфигурация через переменные окружения (с дефолтами)

events.js
- EventBus (паттерн Observer)
- on(event, callback) - подписка
- emit(event, data) - отправка
- Синглтон

auth-middleware.js
- Проверяет заголовок Authorization
- Верифицирует JWT
- Добавляет request.user

4.2 МОДУЛИ

МОДУЛЬ AUTH (auth/index.js)
Роуты:
- POST /auth/register - регистрация
- POST /auth/login - вход, выдача JWT

Зависимости: bcryptjs, jsonwebtoken, db

МОДУЛЬ NOTES (notes/index.js)
Функции:
- extractTags(text) - извлечение #тегов
- Роуты:
  - GET /notes - список заметок пользователя
  - POST /notes - создание
  - PUT /notes/:id - обновление
  - DELETE /notes/:id - удаление

События:
- note:created
- note:updated
- note:deleted

Зависимости: db, events, auth-middleware

МОДУЛЬ TAGS (tags/index.js)
Роуты:
- GET /tags/stats - статистика тегов пользователя

SQL: CROSS JOIN LATERAL unnest(COALESCE(tags, ARRAY[]::TEXT[]))

Зависимости: db, auth-middleware

МОДУЛЬ SEARCH (search/index.js)
Функции:
- ensureCollection() - создание коллекции Typesense
- upsertNote(note) - индексация
- removeNote(id) - удаление из индекса

Роуты:
- GET /search?q= - поиск

Подписки:
- note:created -> upsertNote
- note:updated -> upsertNote
- note:deleted -> removeNote

Зависимости: db, events, auth-middleware, typesense

========================================
5. FRONTEND (ПОДРОБНО)
========================================

5.1 ФАЙЛЫ

main.jsx - рендер React
App.jsx - главный компонент (вся логика)
global.css - стили

5.2 КОМПОНЕНТЫ (внутри App.jsx)

NoteEditor - WYSIWYG-редактор (TipTap)
  - Кнопки: B, I, S, H1, H2, списки, код, линия
  - Поддержка CodeBlockLowlight

App - главный компонент
  Состояния:
  - isLoggedIn, authMode, username, password
  - notes, selectedNote
  - isModalOpen, isEditModalOpen, isDeleteConfirm
  - sortBy, searchQuery, searchResults
  - tagsStats, activeTag
  - title, content, editTitle, editContent

5.3 ФУНКЦИИ

getHeaders() - заголовки с Content-Type и Authorization
getAuthHeader() - только Authorization (для GET/DELETE)
loadNotes() - загрузка заметок
loadTagsStats() - загрузка тегов
handleAuth() - вход/регистрация
handleLogout() - выход
handleSearch() - поиск
handleSubmit() - создание заметки
handleEditSubmit() - обновление заметки
handleDelete() - удаление заметки
handleTagClick() - фильтр по тегу
handleMouseMove() - параллакс тегов

5.4 VITE PROXY

/api/* -> http://127.0.0.1:3333/*

========================================
6. БАЗА ДАННЫХ
========================================

Таблица users:
- id SERIAL PRIMARY KEY
- username TEXT UNIQUE NOT NULL
- password_hash TEXT NOT NULL
- created_at TIMESTAMPTZ DEFAULT NOW()

Таблица notes:
- id SERIAL PRIMARY KEY
- user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
- title TEXT NOT NULL
- content TEXT (HTML от TipTap)
- tags TEXT[] DEFAULT '{}'
- created_at TIMESTAMPTZ DEFAULT NOW()

Связь: users (1) -> (N) notes

========================================
7. ПОИСК (TYPESENSE)
========================================
Коллекция: notes

Поля:
- title (string)
- content (string, HTML)
- tags (string[], facet)
- created_at (int64)
- user_id (int64)

Синхронизация через EventBus:
- note:created -> upsert
- note:updated -> upsert
- note:deleted -> delete

Поиск:
- GET /search?q=текст
- filter_by: user_id:<id>
- query_by: title, content, tags
- sort_by: created_at:desc

========================================
8. АВТОРИЗАЦИЯ (JWT)
========================================
Процесс:
1. Регистрация: bcrypt.hash(password, 10) -> users
2. Вход: bcrypt.compare -> JWT (7 дней)
3. JWT содержит: id, username
4. Middleware верифицирует и добавляет request.user

Секрет: super-secret-key-change-me (сменить в production!)

========================================
9. РЕДАКТОР ТЕКСТА (TIPTAP)
========================================
Библиотеки:
- @tiptap/react
- @tiptap/starter-kit (codeBlock отключен)
- @tiptap/extension-code-block-lowlight
- lowlight (подсветка синтаксиса)

Возможности:
- Жирный, курсив, зачеркнутый
- Заголовки H1, H2
- Списки (маркированный, нумерованный)
- Блок кода с подсветкой
- Горизонтальная линия

Контент хранится как HTML.

========================================
10. ДИЗАЙН-СИСТЕМА
========================================
Цвета:
- Фон: #1a1a1a (Black 85%)
- Акцент: #E35205 (Pantone 166C)
- Акцент hover: #ff6a1a
- Поверхности: rgba(255,255,255,0.03-0.08)
- Текст: #f5f5f5 (основной), #a3a3a3 (вторичный)
- Опасность: #ff4d4d

Стиль:
- Glassmorphism (backdrop-filter: blur)
- Скругления: 12-16px
- Шрифт: Inter
- Тёмная тема

Компоненты:
- auth-container, auth-box
- app-header, logo
- search-bar, search-input
- tag-cloud-container, tag-cloud-item
- sort-bar, sort-btn
- notes-list, list-item
- note-detail
- modal, modal-overlay
- editor-wrapper, editor-toolbar

========================================
11. ВЗАИМОДЕЙСТВИЕ МОДУЛЕЙ
========================================

Создание заметки:
Frontend -> POST /notes -> notes.js -> db.query(INSERT)
  -> EventBus.emit('note:created') -> search.js upsertNote -> Typesense

Обновление:
Frontend -> PUT /notes/:id -> notes.js -> db.query(UPDATE)
  -> EventBus.emit('note:updated') -> search.js upsertNote -> Typesense

Удаление:
Frontend -> DELETE /notes/:id -> notes.js -> db.query(DELETE)
  -> EventBus.emit('note:deleted') -> search.js removeNote -> Typesense

Поиск:
Frontend -> GET /search?q= -> search.js -> Typesense.search -> результат

Теги:
Frontend -> GET /tags/stats -> tags.js -> db.query -> статистика

========================================
12. API ENDPOINTS
========================================
Без авторизации:
- GET /health
- POST /auth/register
- POST /auth/login

С авторизацией:
- GET /notes
- POST /notes
- PUT /notes/:id
- DELETE /notes/:id
- GET /tags/stats
- GET /search?q=

========================================
13. ЗАПУСК И РАЗВЕРТЫВАНИЕ
========================================
Локально (Raspberry Pi):
1. docker compose up -d
2. cd backend && npm install && npm start
3. cd frontend && npm install && npm run dev

Адреса:
- API: http://localhost:3333
- Web: http://localhost:5173

========================================
14. GIT FLOW
========================================
Формат коммитов:
- Feat: описание
- Fix: описание
- Refactor: описание
- Docs: описание

========================================
15. ТЕКУЩИЕ ПРОБЛЕМЫ И TODO
========================================
[x] CRUD заметок
[x] Авторизация
[x] Поиск
[x] Теги с фильтрацией
[x] WYSIWYG-редактор
[x] Подтверждение удаления
[x] Автовыбор последней заметки

TODO:
[ ] Дебаунс поиска
[ ] Пагинация
[ ] Шаринг заметок
[ ] Комментарии
[ ] Версионирование
[ ] Восстановление пароля
[ ] Загрузка файлов
[ ] Экспорт/импорт

========================================
16. ИНСТРУКЦИЯ ДЛЯ LLM
========================================
Если ты ИИ и работаешь с этим проектом:

1. Прочитай этот файл полностью.
2. Не меняй core/ без необходимости.
3. Новые фичи добавляй как модули (backend) или компоненты (frontend).
4. Соблюдай паттерн EventBus для связи модулей.
5. Помни: заметки привязаны к пользователям (user_id).
6. Контент заметок хранится как HTML (TipTap).
7. Теги извлекаются из текста (#тег), но не удаляются из контента.
8. Поиск синхронизируется через события, не напрямую.
9. Все API-запросы (кроме auth) требуют JWT.
10. Тестируй через curl или браузер.
11. Оформляй изменения коммитами.
