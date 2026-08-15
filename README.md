# Smart Notes System

Многопользовательское веб-приложение для заметок.

Версия: 0.5.0

## Возможности
- Авторизация (JWT)
- CRUD заметок
- WYSIWYG-редактор (TipTap)
- Теги (#тег) с облаком и фильтрацией
- Полнотекстовый поиск (Typesense)
- Сортировка
- Тёмная тема (Black 85% + Pantone 166C)

## Стек
- Backend: Node.js, Fastify, PostgreSQL
- Frontend: React, Vite, TipTap
- Search: Typesense
- Auth: JWT

## Быстрый старт
1. docker compose up -d
2. cd backend && npm start
3. cd frontend && npm run dev

## Документация
ARCHITECTURE.md - полная документация
