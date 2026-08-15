// Модуль "Заметки" (CommonJS)
const EventBus = require('../../core/events.js');
const db = require('../../core/db.js');
const authMiddleware = require('../../core/auth-middleware.js');

function extractTags(text = '') {
  const matches = text.match(/#[а-яА-Яa-zA-Z0-9_-]+/g) || [];
  const tags = matches.map(tag => tag.slice(1));
  return [...new Set(tags)];
}

function cleanContent(text = '') {
  return text.replace(/#[а-яА-Яa-zA-Z0-9_-]+/g, '').trim();
}

function notesModule(app, opts, done) {
  
  // Получить заметки ТОЛЬКО текущего пользователя
  app.get('/notes', { preHandler: authMiddleware }, async (request, reply) => {
    const result = await db.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [request.user.id]
    );
    return { data: result.rows };
  });

  // Создать заметку с привязкой к пользователю
  app.post('/notes', { preHandler: authMiddleware }, async (request, reply) => {
    const { title, content } = request.body;
    const tags = extractTags(content);
    const cleanText = cleanContent(content);

    const result = await db.query(
      'INSERT INTO notes (user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING *',
      [request.user.id, title || 'Без названия', cleanText, tags]
    );

    const newNote = result.rows[0];
    EventBus.emit('note:created', newNote);
    return { data: newNote };
  });

  // Удалить заметку (только свою)
  app.delete('/notes/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const result = await db.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [request.params.id, request.user.id]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Заметка не найдена' });
    }
    
    EventBus.emit('note:deleted', request.params.id);
    return { success: true };
  });

  done();
}

module.exports = notesModule;
