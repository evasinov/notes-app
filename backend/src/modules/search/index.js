const EventBus = require('../../core/events.js');
const Typesense = require('typesense');
const authMiddleware = require('../../core/auth-middleware.js');

const client = new Typesense.Client({
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'secret_key',
  connectionTimeoutSeconds: 5
});

const COLLECTION = 'notes';

async function ensureCollection() {
  try {
    await client.collections(COLLECTION).retrieve();
    console.log('[Search] Коллекция существует');
  } catch (err) {
    try {
      await client.collections().create({
        name: COLLECTION,
        fields: [
          { name: 'title', type: 'string' },
          { name: 'content', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
          { name: 'created_at', type: 'int64' },
          { name: 'user_id', type: 'int64' },
          { name: 'is_pinned', type: 'bool' }
        ],
        default_sorting_field: 'created_at'
      });
      console.log('[Search] Коллекция создана');
    } catch (createErr) {
      console.error('[Search] Ошибка создания коллекции:', createErr.message);
    }
  }
}

async function upsertNote(note) {
  try {
    await client.collections(COLLECTION).documents().upsert({
      id: note.id.toString(),
      title: note.title,
      content: note.content || '',
      tags: note.tags || [],
      created_at: Date.parse(note.created_at),
      user_id: note.user_id,
      is_pinned: note.is_pinned || false
    });
  } catch (err) {
    console.error('[Search] Ошибка индексации:', err.message);
  }
}

async function removeNote(id) {
  try {
    await client.collections(COLLECTION).documents(id.toString()).delete();
  } catch (err) {
    console.error('[Search] Ошибка удаления:', err.message);
  }
}

function searchModule(app, opts, done) {
  ensureCollection().catch(console.error);
  EventBus.on('note:created', upsertNote);
  EventBus.on('note:updated', upsertNote);
  EventBus.on('note:deleted', removeNote);

  app.get('/search', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { q } = request.query;
      if (!q || q.length < 1) return { data: [] };

      const results = await client.collections(COLLECTION).documents().search({
        q: q,
        query_by: 'title, content, tags',
        filter_by: `user_id:${request.user.id}`,
        sort_by: 'created_at:desc'
      });

      return { data: results.hits?.map(hit => hit.document) || [] };
    } catch (err) {
      console.error('[Search] Ошибка поиска:', err.message);
      return { data: [] };
    }
  });

  done();
}

module.exports = searchModule;
