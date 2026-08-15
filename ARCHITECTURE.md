Архитектура Smart Notes System

Документ для разработчиков и LLM-агентов.

## 1. Обзор

Проект разделён на Backend (API) и Frontend (React SPA).
Frontend запрашивает данные через HTTP у Backend.
Backend хранит данные в PostgreSQL и синхронизирует поиск в Typesense.

## 2. Backend (Node.js + Fastify)

Путь: backend/

Ядро (Core):
- core/server.js — точка входа, запускает Fastify, подключает модули
- core/db.js — пул соединений с PostgreSQL
- core/events.js — шина событий (EventBus)

Модули:
Каждый модуль — папка в backend/src/modules/<имя>/index.js
Правила:
1. Модуль не знает о других модулях
2. Модуль экспортирует функцию function module(app, opts, done)
3. В server.js модуль подключается через app.register(module)

Как добавить новый модуль:
1. Создай папку backend/src/modules/<имя>/index.js
2. Напиши роуты (например, app.get('/<имя>', ...))
3. Импортируй и подключи в core/server.js через app.register()

Текущие модули:
- notes: GET /notes, POST /notes, DELETE /notes/:id
- search: GET /search?q=текст

## 3. Поиск (Typesense)

Модуль search слушает события EventBus:
- note:created -> индексирует заметку в Typesense
- note:deleted -> удаляет заметку из индекса

Typesense коллекция: notes
Поля: title, content, tags, created_at

## 4. Frontend (React + Vite)

Путь: frontend/

Файлы:
- src/App.jsx — главный компонент (шапка, поиск, список, модалка, сортировка)
- src/main.jsx — точка входа React
- src/styles/global.css — все стили

API Proxy:
Vite проксирует /api/* на http://localhost:3333/*
Фронтенд пишет fetch('/api/notes'), реально запрос идёт на http://localhost:3333/notes

## 5. База данных

Таблица notes:
- id SERIAL PRIMARY KEY
- title TEXT NOT NULL
- content TEXT
- tags TEXT[] DEFAULT '{}'
- created_at TIMESTAMPTZ DEFAULT NOW()

Миграции выполняются при старте (db.initSchema())

## 6. Дизайн

Стиль: Dark Theme + Glassmorphism
Фон: Black 85% (#1a1a1a)
Акцент: Pantone 166C (#E35205)

## 7. Git Flow

Формат коммитов:
- Feat: <что добавлено>
- Fix: <что исправлено>
- Refactor: <что переделано>
- Docs: <что задокументировано>

## 8. План развития

- [x] Модульная архитектура
- [x] Парсер тегов
- [x] Поиск (Typesense)
- [ ] Авторизация (JWT)
- [ ] Шаринг заметок коллегам
- [ ] Комментарии к заметкам
- [ ] Версионирование изменений

## 9. LLM-инструкция

Если ты (ИИ) работаешь с этим проектом:
1. Сначала прочитай этот файл
2. Не меняй core/ без необходимости
3. Новые фичи добавляй как модули (Backend) или компоненты (Frontend)
4. Все изменения оформляй коммитами с понятными сообщениями
