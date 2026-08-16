const EventBus = require('../../core/events.js');
const db = require('../../core/db.js');
const authMiddleware = require('../../core/auth-middleware.js');

function extractTags(text = '') {
  const matches = text.match(/#[а-яА-Яa-zA-Z0-9_-]+/g) || [];
  const tags = matches.map(tag => tag.slice(1));
  return [...new Set(tags)];
}

// Извлекает [[Ссылки на заметки]]
function extractLinks(text = '') {
  const matches = text.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map(link => link.slice(2, -2).trim());
}

// Создает связи в note_links
async function createLinks(sourceNoteId, content, userId) {
  const links = extractLinks(content);
  
  for (const linkTitle of links) {
    // Ищем заметку с таким заголовком у этого пользователя
    const target = await db.query(
      'SELECT id FROM notes WHERE title = $1 AND user_id = $2',
      [linkTitle, userId]
    );
    
    if (target.rows.length > 0) {
      const targetId = target.rows[0].id;
      
      // Создаем связь (если нет)
      await db.query(
        'INSERT INTO note_links (source_note_id, target_note_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [sourceNoteId, targetId]
      );
    }
  }
}

// Удаляет старые связи заметки
async function clearLinks(noteId) {
  await db.query('DELETE FROM note_links WHERE source_note_id = $1', [noteId]);
}

function notesModule(app, opts, done) {
  
  app.get('/notes', { preHandler: authMiddleware }, async (request, reply) => {
    const result = await db.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY is_pinned DESC, created_at DESC',
      [request.user.id]
    );
    return { data: result.rows };
  });

  app.post('/notes', { preHandler: authMiddleware }, async (request, reply) => {
    const { title, content } = request.body;
    const tags = extractTags(content);

    const result = await db.query(
      'INSERT INTO notes (user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING *',
      [request.user.id, title || 'Без названия', content, tags]
    );

    const newNote = result.rows[0];
    
    // Создаем связи
    await createLinks(newNote.id, content, request.user.id);
    
    EventBus.emit('note:created', newNote);
    return { data: newNote };
  });

  app.patch('/notes/:id/pin', { preHandler: authMiddleware }, async (request, reply) => {
    const noteId = parseInt(request.params.id, 10);
    if (isNaN(noteId)) return reply.code(400).send({ error: 'Неверный ID' });

    const result = await db.query(
      'UPDATE notes SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING *',
      [noteId, request.user.id]
    );

    if (result.rows.length === 0) return reply.code(404).send({ error: 'Заметка не найдена' });

    EventBus.emit('note:updated', result.rows[0]);
    return { data: result.rows[0] };
  });

  app.put('/notes/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const noteId = parseInt(request.params.id, 10);
    if (isNaN(noteId)) return reply.code(400).send({ error: 'Неверный ID' });

    const { title, content } = request.body;
    const tags = extractTags(content);

    const result = await db.query(
      'UPDATE notes SET title = $1, content = $2, tags = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [title || 'Без названия', content, tags, noteId, request.user.id]
    );

    if (result.rows.length === 0) return reply.code(404).send({ error: 'Заметка не найдена' });

    // Обновляем связи
    await clearLinks(noteId);
    await createLinks(noteId, content, request.user.id);
    
    EventBus.emit('note:updated', result.rows[0]);
    return { data: result.rows[0] };
  });

  app.delete('/notes/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const noteId = parseInt(request.params.id, 10);
    if (isNaN(noteId)) return reply.code(400).send({ error: 'Неверный ID' });

    const result = await db.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [noteId, request.user.id]
    );
    
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Заметка не найдена' });
    
    EventBus.emit('note:deleted', noteId);
    return { success: true };
  });

  // Получить связи заметки
  app.get('/notes/:id/links', { preHandler: authMiddleware }, async (request, reply) => {
    const noteId = parseInt(request.params.id, 10);
    
    const result = await db.query(`
      SELECT n.id, n.title, n.tags
      FROM note_links nl
      JOIN notes n ON n.id = nl.target_note_id
      WHERE nl.source_note_id = $1
    `, [noteId]);
    
    return { data: result.rows };
  });

  // Получить данные для графа
  app.get('/notes/graph', { preHandler: authMiddleware }, async (request, reply) => {
    const nodes = await db.query(
      'SELECT id, title, tags FROM notes WHERE user_id = $1',
      [request.user.id]
    );
    
    const links = await db.query(`
      SELECT nl.source_note_id, nl.target_note_id
      FROM note_links nl
      JOIN notes n ON n.id = nl.source_note_id
      WHERE n.user_id = $1
    `, [request.user.id]);
    
    return {
      data: {
        nodes: nodes.rows,
        links: links.rows
      }
    };
  });

  done();
}

module.exports = notesModule;
