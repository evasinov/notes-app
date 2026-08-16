SMART NOTES SYSTEM - ПОЛНАЯ ДОКУМЕНТАЦИЯ
Версия: 0.6.0
Дата: 2026-08-16

ОГЛАВЛЕНИЕ
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
15. Текущие возможности и TODO
16. Инструкция для LLM

1. ОБЗОР ПРОЕКТА
Smart Notes - многопользовательское веб-приложение для создания,
хранения, поиска и редактирования заметок.

Возможности:
- Регистрация и авторизация (JWT)
- CRUD заметок (создание, чтение, обновление, удаление)
- WYSIWYG-редактор (TipTap) с поддержкой кода
- Автоматическое распознавание тегов (#тег)
- Облако тегов с фильтрацией и параллакс-эффектом
- Полнотекстовый поиск (Typesense)
- Закрепление заметок (Pin) с анимацией
- Растягиваемые модальные окна
- Автовыбор последней заметки
- Подтверждение удаления
- Сортировка (по дате, алфавиту)
- Привязка заметок к пользователям
- Адаптивный тёмный интерфейс

2. ТЕХНОЛОГИЧЕСКИЙ СТЕК
Backend:
- Node.js 18+
- Fastify 4
- pg (PostgreSQL драйвер)
- typesense
- jsonwebtoken
- bcryptjs

Frontend:
- React 18
- Vite 5
- TipTap (редактор)
- lowlight (подсветка кода)
- CSS (чистый)

Инфраструктура:
- PostgreSQL 16 (Docker)
- Typesense 27 (Docker)
- Docker Compose

3. СТРУКТУРА ПРОЕКТА
notes-app/
  docker-compose.yml
  README.md
  ARCHITECTURE.md
  backend/
    src/
      core/
        server.js - точка входа
        db.js - пул PostgreSQL
        events.js - EventBus
        auth-middleware.js - JWT проверка
      modules/
        auth/index.js - регистрация, вход
        notes/index.js - CRUD заметок + pin
        tags/index.js - статистика тегов
        search/index.js - поиск Typesense
  frontend/
    src/
      main.jsx - точка входа React
      App.jsx - главный компонент
      styles/global.css - стили

4. BACKEND (ПОДРОБНО)
4.1 ЯДРО
server.js - Fastify, порт 3333, подключение модулей
db.js - query(), initSchema() (создание таблиц и колонок)
events.js - EventBus (on, emit)
auth-middleware.js - проверка JWT, добавляет request.user

4.2 МОДУЛИ
auth: POST /auth/register, POST /auth/login
notes: GET /notes, POST /notes, PUT /notes/:id, DELETE /notes/:id, PATCH /notes/:id/pin
tags: GET /tags/stats
search: GET /search?q=

События EventBus:
note:created -> search.js upsertNote
note:updated -> search.js upsertNote
note:deleted -> search.js removeNote

5. FRONTEND (ПОДРОБНО)
Компоненты:
- NoteEditor (TipTap WYSIWYG)
- ResizableModal (растягиваемые модалки)
- App (главный компонент)

Состояния App:
isLoggedIn, authMode, username, password
notes, selectedNote
isModalOpen, isEditModalOpen, isDeleteConfirm
sortBy, searchQuery, searchResults
tagsStats, activeTag
pinnedNoteId
title, content, editTitle, editContent

Функции:
getHeaders() - Content-Type + Authorization
getAuthHeader() - только Authorization
loadNotes() - загрузка с автовыбором последней
loadTagsStats() - загрузка тегов
handleTogglePin() - закрепление с анимацией
handleSearch() - поиск с защитой от ошибок
handleSubmit() / handleEditSubmit() - создание/обновление
handleDelete() - удаление с подтверждением

6. БАЗА ДАННЫХ
users: id, username, password_hash, created_at
notes: id, user_id (FK), title, content (HTML), tags (TEXT[]), is_pinned (BOOLEAN), created_at

7. ПОИСК (TYPESENSE)
Коллекция: notes
Поля: title, content, tags, created_at, user_id, is_pinned
Фильтр: user_id
Сортировка: created_at DESC

8. АВТОРИЗАЦИЯ
JWT, срок 7 дней
Секрет: super-secret-key-change-me (сменить!)

9. РЕДАКТОР (TIPTAP)
Библиотеки: @tiptap/react, starter-kit, code-block-lowlight, lowlight
Кнопки: B, I, S, H1, H2, списки, код, линия

10. ДИЗАЙН
Фон: #1a1a1a (Black 85%)
Акцент: #E35205 (Pantone 166C)
Стиль: Glassmorphism, тёмная тема
Шрифт: Inter

11. ВЗАИМОДЕЙСТВИЕ
Создание: Frontend -> POST /notes -> notes.js -> DB + EventBus -> search.js -> Typesense
Обновление: Frontend -> PUT /notes/:id -> notes.js -> DB + EventBus -> search.js -> Typesense
Закрепление: Frontend -> PATCH /notes/:id/pin -> notes.js -> DB -> EventBus -> search.js
Удаление: Frontend -> DELETE /notes/:id -> notes.js -> DB + EventBus -> search.js -> Typesense

12. API ENDPOINTS
GET /health
POST /auth/register
POST /auth/login
GET /notes (auth)
POST /notes (auth)
PUT /notes/:id (auth)
DELETE /notes/:id (auth)
PATCH /notes/:id/pin (auth)
GET /tags/stats (auth)
GET /search?q= (auth)

13. ЗАПУСК
docker compose up -d
cd backend && npm start (порт 3333)
cd frontend && npm run dev (порт 5173)

14. GIT FLOW
Feat: / Fix: / Refactor: / Docs:

15. ВОЗМОЖНОСТИ И TODO
[x] CRUD, [x] Авторизация, [x] Поиск, [x] Теги, [x] Pin, [x] Редактор, [x] Растягивание окон
TODO: дебаунс поиска, пагинация, шаринг, комментарии, экспорт, бэкапы

16. ИНСТРУКЦИЯ ДЛЯ LLM
1. Не менять core/ без необходимости
2. Новые фичи - как модули (backend) или компоненты (frontend)
3. События для связи модулей
4. Контент - HTML (TipTap)
5. Все API (кроме auth) требуют JWT
6. Тестировать через curl или браузер
7. Коммитить изменения
