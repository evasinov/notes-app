SMART NOTES SYSTEM - ПОЛНАЯ ТЕХНИЧЕСКАЯ ДОКУМЕНТАЦИЯ
Версия: 0.7.0
Дата: 2026-08-16
Автор: evasinov

========================================
ОГЛАВЛЕНИЕ
========================================
1. Обзор проекта
2. Технологический стек
3. Структура проекта
4. Backend (подробно)
5. Frontend (подробно)
6. База данных (детально)
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

========================================
1. ОБЗОР ПРОЕКТА
========================================
Smart Notes - многопользовательское веб-приложение для создания,
хранения, поиска и редактирования заметок.

Целевая аудитория: системные аналитики страховой компании.

Ключевые особенности:
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

========================================
2. ТЕХНОЛОГИЧЕСКИЙ СТЕК
========================================
Backend:
- Node.js 18+ (среда выполнения)
- Fastify 4 (веб-фреймворк, аналог Express, но быстрее)
- pg (драйвер PostgreSQL)
- typesense (клиент поискового движка)
- jsonwebtoken (JWT для авторизации)
- bcryptjs (хеширование паролей)

Frontend:
- React 18 (UI-библиотека)
- Vite 5 (сборщик, dev-server)
- TipTap (WYSIWYG-редактор на ProseMirror)
- lowlight (подсветка синтаксиса кода)
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
│           ├── auth/
│           │   └── index.js    # Регистрация, вход
│           ├── notes/
│           │   └── index.js    # CRUD заметок + pin
│           ├── tags/
│           │   └── index.js    # Статистика тегов
│           └── search/
│               └── index.js    # Поиск Typesense
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

server.js:
- Создает экземпляр Fastify с логированием
- Вызывает db.initSchema() для миграций
- Подключает модули через app.register()
- Запускает на 0.0.0.0:3333
- Эмитит событие server:started

db.js:
- Создает пул PostgreSQL (pg.Pool)
- Экспортирует query(text, params) - выполнение SQL
- Экспортирует initSchema() - миграции
- Конфигурация через переменные окружения (с дефолтами)

events.js:
- EventBus (паттерн Observer)
- on(event, callback) - подписка
- emit(event, data) - отправка
- Синглтон (один экземпляр на всё приложение)

auth-middleware.js:
- Проверяет заголовок Authorization
- Верифицирует JWT
- Добавляет request.user (id, username)

4.2 МОДУЛИ

МОДУЛЬ AUTH (auth/index.js)
Роуты:
- POST /auth/register - регистрация
  Вход: username, password
  Хеширует пароль (bcrypt, 10 раундов)
  Сохраняет в users
  Выход: id, username

- POST /auth/login - вход
  Вход: username, password
  Проверяет пароль через bcrypt.compare
  Выдает JWT (7 дней)
  Выход: token, user

Зависимости: bcryptjs, jsonwebtoken, db

МОДУЛЬ NOTES (notes/index.js)
Функции:
- extractTags(text) - извлекает #теги из текста (не удаляет их)
- cleanContent(text) - убирает теги (используется при сохранении)

Роуты:
- GET /notes - список заметок пользователя
  Сортировка: is_pinned DESC, created_at DESC

- POST /notes - создание
  Вход: title, content (HTML)
  Извлекает теги, сохраняет с user_id
  Эмитит note:created

- PUT /notes/:id - обновление
  Вход: title, content
  Извлекает теги заново
  Эмитит note:updated

- DELETE /notes/:id - удаление
  Проверяет, что заметка принадлежит пользователю
  Эмитит note:deleted

- PATCH /notes/:id/pin - переключение закрепления
  UPDATE notes SET is_pinned = NOT is_pinned
  Эмитит note:updated

Зависимости: db, events, auth-middleware

МОДУЛЬ TAGS (tags/index.js)
Роуты:
- GET /tags/stats - статистика тегов пользователя
  SQL: CROSS JOIN LATERAL unnest(COALESCE(tags, ARRAY[]::TEXT[]))
  Группировка по тегу, подсчет количества

Зависимости: db, auth-middleware

МОДУЛЬ SEARCH (search/index.js)
Функции:
- ensureCollection() - создание коллекции Typesense
- upsertNote(note) - индексация/обновление
- removeNote(id) - удаление из индекса

Роуты:
- GET /search?q= - поиск
  Фильтр: user_id
  Поля: title, content, tags
  Сортировка: created_at DESC

Подписки:
- note:created -> upsertNote
- note:updated -> upsertNote
- note:deleted -> removeNote

Зависимости: db, events, auth-middleware, typesense

========================================
5. FRONTEND (ПОДРОБНО)
========================================

5.1 ФАЙЛЫ
main.jsx - рендер React в #root
App.jsx - главный компонент (вся логика)
global.css - стили

5.2 КОМПОНЕНТЫ (внутри App.jsx)

NoteEditor:
- WYSIWYG-редактор на TipTap
- Кнопки: B, I, S, H1, H2, списки, код, линия
- Поддержка CodeBlockLowlight (подсветка кода)
- Содержимое хранится как HTML

ResizableModal:
- Растягиваемое модальное окно
- Кастомная ручка в правом нижнем углу
- Логика: mousedown -> mousemove -> mouseup
- Блокировка закрытия во время растягивания (resizeFlag)

App:
- Главный компонент
- Управляет всеми состояниями

5.3 СОСТОЯНИЯ APP
isLoggedIn - авторизован ли
authMode - login/register
username - имя пользователя
password - пароль
authError - ошибка авторизации
notes - список заметок
selectedNote - выбранная заметка
isModalOpen - модалка добавления
isEditModalOpen - модалка редактирования
sortBy - сортировка (date_desc, date_asc, title_asc)
searchQuery - строка поиска
searchResults - результаты поиска
tagsStats - статистика тегов
activeTag - активный тег (фильтр)
isDeleteConfirm - подтверждение удаления
pinnedNoteId - ID заметки с анимацией закрепления
title, content - поля формы добавления
editTitle, editContent - поля формы редактирования

5.4 ФУНКЦИИ APP
getHeaders() - Content-Type + Authorization
getAuthHeader() - только Authorization
loadNotes() - загрузка с автовыбором последней
loadTagsStats() - загрузка тегов
handleMouseMove() - параллакс тегов
handleTagClick() - фильтр по тегу
handleTogglePin() - закрепление с анимацией
handleAuth() - вход/регистрация
handleLogout() - выход
handleSearch() - поиск с защитой от ошибок
handleSubmit() - создание
handleEditClick() - открытие редактирования
handleEditSubmit() - обновление
handleDelete() - удаление

5.5 VITE PROXY
/api/* -> http://127.0.0.1:3333/*

========================================
6. БАЗА ДАННЫХ (ДЕТАЛЬНО)
========================================

6.1 ТАБЛИЦА users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

Поля:
id - автоинкремент, первичный ключ
username - уникальный логин (UNIQUE constraint)
password_hash - bcrypt хеш (10 раундов)
created_at - дата регистрации (автоматически)

Индексы:
PRIMARY KEY (id)
UNIQUE (username) - автоматически создается

6.2 ТАБЛИЦА notes
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

Поля:
id - автоинкремент, первичный ключ
user_id - внешний ключ на users(id), CASCADE удаление
title - тема заметки
content - HTML содержимое (TipTap)
tags - массив тегов (TEXT[])
is_pinned - закреплена ли (BOOLEAN)
created_at - дата создания

Индексы:
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Неявный индекс на user_id (создается PostgreSQL автоматически)

6.3 МИГРАЦИИ
Выполняются в db.js -> initSchema() при каждом старте:
1. CREATE TABLE IF NOT EXISTS users
2. CREATE TABLE IF NOT EXISTS notes
3. ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id
4. ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned

========================================
7. ПОИСК (TYPESENSE)
========================================
Коллекция: notes

Поля:
- title (string)
- content (string, HTML)
- tags (string[], facet)
- created_at (int64, timestamp)
- user_id (int64)
- is_pinned (bool)

Синхронизация через EventBus:
note:created -> upsertNote
note:updated -> upsertNote
note:deleted -> removeNote

Поиск:
GET /search?q=текст
filter_by: user_id:<id>
query_by: title, content, tags
sort_by: created_at:desc

========================================
8. АВТОРИЗАЦИЯ (JWT)
========================================
Процесс:
1. Регистрация: bcrypt.hash(password, 10) -> users
2. Вход: bcrypt.compare -> JWT
3. JWT содержит: id, username
4. Срок: 7 дней
5. Middleware верифицирует токен

Секрет: super-secret-key-change-me (сменить в production!)

========================================
9. РЕДАКТОР ТЕКСТА (TIPTAP)
========================================
Библиотеки:
@tiptap/react - React-обертка
@tiptap/starter-kit - базовые расширения
@tiptap/extension-code-block-lowlight - блок кода с подсветкой
lowlight - подсветка синтаксиса

Возможности:
- Жирный (Bold)
- Курсив (Italic)
- Зачеркнутый (Strike)
- Заголовки H1, H2
- Маркированный список
- Нумерованный список
- Блок кода с подсветкой
- Горизонтальная линия

Важно:
StarterKit.configure({ codeBlock: false }) - отключаем стандартный код-блок,
чтобы использовать CodeBlockLowlight без конфликтов.

Контент хранится как HTML.

========================================
10. ДИЗАЙН-СИСТЕМА
========================================
Цвета:
--bg-primary: #1a1a1a (Black 85%)
--bg-secondary: #242424
--glass-bg: rgba(255,255,255,0.03)
--glass-border: rgba(255,255,255,0.08)
--text-primary: #f5f5f5
--text-secondary: #a3a3a3
--accent: #E35205 (Pantone 166C)
--accent-hover: #ff6a1a
--danger: #ff4d4d
--success: #4ade80

Шрифт: Inter (Google Fonts)

Стиль:
Glassmorphism (backdrop-filter: blur)
Скругления: 12-16px
Тени: мягкие

Компоненты:
auth-container, auth-box - экран входа
app-header, logo - шапка
search-bar, search-input - поиск
tag-cloud-container, tag-cloud-item - облако тегов
sort-bar, sort-btn - сортировка
notes-list, list-item - список
note-detail - просмотр
modal, modal-overlay - модалки
resize-handle - ручка растягивания
editor-wrapper, editor-toolbar - редактор

========================================
11. ВЗАИМОДЕЙСТВИЕ МОДУЛЕЙ
========================================

Создание заметки:
Frontend -> POST /notes -> notes.js -> db.query(INSERT) 
  -> EventBus.emit('note:created') -> search.js upsertNote -> Typesense

Обновление:
Frontend -> PUT /notes/:id -> notes.js -> db.query(UPDATE)
  -> EventBus.emit('note:updated') -> search.js upsertNote -> Typesense

Закрепление:
Frontend -> PATCH /notes/:id/pin -> notes.js -> db.query(UPDATE)
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
GET /health - проверка жизни
POST /auth/register - регистрация
POST /auth/login - вход

С авторизацией (JWT):
GET /notes - список заметок
POST /notes - создание
PUT /notes/:id - обновление
DELETE /notes/:id - удаление
PATCH /notes/:id/pin - закрепление
GET /tags/stats - статистика тегов
GET /search?q= - поиск

========================================
13. ЗАПУСК И РАЗВЕРТЫВАНИЕ
========================================
Локально (Raspberry Pi):
1. docker compose up -d (PostgreSQL + Typesense)
2. cd backend && npm install && npm start (порт 3333)
3. cd frontend && npm install && npm run dev (порт 5173)

Проверка:
curl http://localhost:3333/health
Браузер: http://localhost:5173

========================================
14. GIT FLOW
========================================
Формат коммитов:
Feat: описание - новая функция
Fix: описание - исправление
Refactor: описание - переделка
Docs: описание - документация

========================================
15. ВОЗМОЖНОСТИ И TODO
========================================
[x] CRUD заметок
[x] Авторизация (JWT)
[x] Поиск (Typesense)
[x] Теги с фильтрацией
[x] WYSIWYG-редактор
[x] Закрепление (Pin)
[x] Растягивание окон
[x] Подтверждение удаления
[x] Автовыбор последней заметки

TODO:
[ ] Дебаунс поиска
[ ] Пагинация
[ ] Шаринг заметок
[ ] Комментарии
[ ] Версионирование
[ ] Восстановление пароля
[ ] Экспорт в Markdown/PDF
[ ] Загрузка файлов

========================================
16. ИНСТРУКЦИЯ ДЛЯ LLM
========================================
Если ты ИИ и работаешь с этим проектом:

1. Прочитай этот файл полностью.
2. Не меняй core/ без явной необходимости.
3. Новые фичи добавляй как модули (backend) или компоненты (frontend).
4. Соблюдай паттерн EventBus для связи модулей.
5. Помни: заметки привязаны к пользователям (user_id).
6. Контент заметок хранится как HTML (TipTap).
7. Теги извлекаются из текста (#тег), но не удаляются из контента.
8. Поиск синхронизируется через события, не напрямую.
9. Все API-запросы (кроме auth) требуют JWT.
10. Проверяй типы данных (parseInt для ID).
11. Для DELETE-запросов НЕ отправляй Content-Type.
12. Тестируй через curl или браузер.
13. Оформляй изменения коммитами.
14. Если сомневаешься - спрашивай.

========================================
17. ГРАФ СВЯЗЕЙ (BACKLINKS)
========================================

17.1 ТАБЛИЦА note_links
CREATE TABLE note_links (
  id SERIAL PRIMARY KEY,
  source_note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_note_id, target_note_id)
);

Назначение: хранение связей между заметками.

17.2 СИНТАКСИС ССЫЛОК
В тексте заметки: [[Точное название другой заметки]]
При сохранении бэкенд:
1. Извлекает [[...]] из контента
2. Ищет заметку с таким заголовком (у того же пользователя)
3. Создает связь в note_links

17.3 API
GET /notes/graph - данные для графа
Возвращает:
{
  nodes: [{ id, title, tags }],
  links: [{ source_note_id, target_note_id }]
}

17.4 ФРОНТЕНД
Библиотека: react-force-graph-2d
Кнопка: "🕸 Граф" в шапке
Модалка: GraphModal

Особенности:
- Стрелки (linkDirectionalArrowLength=6)
- Частицы (linkDirectionalParticles=2)
- Цвет узлов: #E35205 (Pantone 166C)
- Подписи узлов: Inter, 11px, белый
- Преобразование данных: source_note_id -> source, target_note_id -> target

17.5 ДЕБАУНС ПОИСКА
Реализован через useRef (debounceTimer)
Задержка: 500мс
Функция: handleSearchChange

17.6 ФОКУС ПРИ РЕДАКТИРОВАНИИ
После сохранения изменений:
- selectedNote сохраняется (не сбрасывается)
- Список обновляется
- Фокус остается на редактируемой заметке


========================================
18. ПОДСКАЗКИ ТЕГОВ (TAG SUGGESTIONS)
========================================
Реализованы через TipTap Mention extension.

Библиотеки:
- @tiptap/extension-mention
- @tiptap/suggestion

Как работает:
1. Пользователь вводит # в редакторе
2. Появляется выпадающий список с существующими тегами
3. Список фильтруется при вводе
4. Клик по тегу - вставка

Позиционирование:
- popup.position = fixed
- Привязан к clientRect (позиция курсора)

Стили:
- .tag-suggestion-popup - контейнер
- .tag-suggestion-item - элемент списка
- .tag-suggestion-item.selected - выбранный элемент

========================================
19. ФИЛЬТР ПО ДАТЕ
========================================
Кнопки: Все, Сегодня, Вчера, Неделя, Месяц

Реализация:
- dateFilter state в App.jsx
- filterByDate() функция
- Сравнение created_at с текущей датой

Логика:
today: created_at >= начало сегодняшнего дня
yesterday: created_at >= вчера И < сегодня
week: created_at >= 7 дней назад
month: created_at >= 1 месяц назад

========================================
20. СКРОЛЛБАРЫ В ТЕМУ
========================================
Webkit (Chrome, Edge, Safari):
::-webkit-scrollbar - ширина 8px
::-webkit-scrollbar-track - фон rgba(255,255,255,0.03)
::-webkit-scrollbar-thumb - оранжевый rgba(227,82,5,0.4)

Firefox:
scrollbar-width: thin
scrollbar-color: rgba(227,82,5,0.4) rgba(255,255,255,0.03)

========================================
21. АКТУАЛЬНАЯ СТРУКТУРА APP.JSX
========================================
Компоненты:
- NoteEditor (TipTap + Mention)
- ResizableModal (растягиваемые модалки)
- GraphModal (граф связей)
- App (главный)

Состояния App:
- isLoggedIn, authMode, username, password, authError
- notes, selectedNote
- isModalOpen, isEditModalOpen, isDeleteConfirm
- sortBy, searchQuery, searchResults
- tagsStats, activeTag
- pinnedNoteId
- isGraphOpen, graphData
- dateFilter
- title, content, editTitle, editContent

Функции:
- getHeaders(), getAuthHeader()
- loadNotes(), loadTagsStats(), loadGraphData()
- handleMouseMove(), handleTagClick()
- handleTogglePin(), handleAuth(), handleLogout()
- handleSearchChange() (debounce 500ms)
- handleSubmit(), handleEditClick(), handleEditSubmit()
- handleDelete()
- filterByDate()

Дополнительно:
- availableTags = tagsStats.map(t => t.tag) - для подсказок
- maxTagCount - для размера тегов в облаке
