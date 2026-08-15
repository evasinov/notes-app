const EventBus = require('../../core/events.js');
const db = require('../../core/db.js');
const authMiddleware = require('../../core/auth-middleware.js');

function extractTags(text = '') {
  const matches = text.match(/#[а-яА-Яa-zA-Z0-9_-]+/g) || [];
  const tags = matches.map(tag => tag.slice(1));
  return [...new Set(tags)];
}

function notesModule(app, opts, done) {
  
  app.get('/notes', { preHandler: authMiddleware }, async (request, reply) => {
    const result = await db.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
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
    EventBus.emit('note:created', newNote);
    return { data: newNote };
  });

  // Обновление заметки
  app.put('/notes/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const noteId = parseInt(request.params.id, 10);
    if (isNaN(noteId)) {
      return reply.code(400).send({ error: 'Неверный ID' });
    }

    const { title, content } = request.body;
    const tags = extractTags(content);

    const result = await db.query(
      `UPDATE notes 
       SET title = $1, content = $2, tags = $3 
       WHERE id = $4 AND user_id = $5 
       RETURNING *`,
      [title || 'Без названия', content, tags, noteId, request.user.id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Заметка не найдена' });
    }

    const updatedNote = result.rows[0];
    EventBus.emit('note:updated', updatedNote);
    return { data: updatedNote };
  });

  app.delete('/notes/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const noteId = parseInt(request.params.id, 10);
    if (isNaN(noteId)) {
      return reply.code(400).send({ error: 'Неверный ID' });
    }

    const result = await db.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [noteId, request.user.id]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Заметка не найдена' });
    }
    
    EventBus.emit('note:deleted', noteId);
    return { success: true };
  });

  done();
}

module.exports = notesModule;
