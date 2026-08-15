// Модуль "Поиск" (Search)
// Слушает события EventBus и синхронизирует данные с Typesense

import EventBus from '../../core/events.js';
import Typesense from 'typesense';

// Настройки подключения к Typesense (совпадают с docker-compose)
const client = new Typesense.Client({
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'secret_key',
  connectionTimeoutSeconds: 2
});

// Имя коллекции (таблицы) в Typesense
const COLLECTION = 'notes';

// Функция для создания коллекции при старте
async function ensureCollection() {
  try {
    await client.collections(COLLECTION).retrieve();
    console.log('[Search] Коллекция уже существует');
  } catch (err) {
    await client.collections().create({
      name: COLLECTION,
      fields: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'tags', type: 'string[]', facet: true },
        { name: 'created_at', type: 'int64' }
      ],
      default_sorting_field: 'created_at'
    });
    console.log('[Search] Коллекция создана');
  }
}

// Добавляет или обновляет заметку в поисковом индексе
async function upsertNote(note) {
  try {
    await client.collections(COLLECTION).documents().upsert({
      id: note.id.toString(),
      title: note.title,
      content: note.content || '',
      tags: note.tags || [],
      created_at: Date.parse(note.created_at)
    });
    console.log(`[Search] Заметка ${note.id} проиндексирована`);
  } catch (err) {
    console.error('[Search] Ошибка индексации:', err.message);
  }
}

// Удаляет заметку из индекса
async function removeNote(id) {
  try {
    await client.collections(COLLECTION).documents(id.toString()).delete();
    console.log(`[Search] Заметка ${id} удалена из индекса`);
  } catch (err) {
    console.error('[Search] Ошибка удаления:', err.message);
  }
}

// Точка входа модуля (вызывается из core/server.js)
function searchModule(app, opts, done) {
  
  // Инициализируем коллекцию
  ensureCollection().catch(console.error);

  // Подписываемся на события от других модулей
  EventBus.on('note:created', (note) => {
    upsertNote(note);
  });

  EventBus.on('note:deleted', (id) => {
    removeNote(id);
  });

  // Роут для поиска (его будет дергать фронтенд)
  app.get('/search', async (request, reply) => {
    const { q } = request.query;
    
    if (!q || q.length < 1) {
      return { data: [] };
    }

    const results = await client.collections(COLLECTION).documents().search({
      q: q,
      query_by: 'title, content, tags',
      sort_by: 'created_at:desc'
    });

    return { data: results.hits?.map(hit => hit.document) || [] };
  });

  done();
}

export default searchModule;

