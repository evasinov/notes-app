// Модуль "Заметки" с умным парсером тегов
import EventBus from '../../core/events.js';
import db from '../../core/db.js';

// Функция для извлечения тегов из текста
function extractTags(text) {
  const matches = text.match(/#[а-яА-Яa-zA-Z0-9_-]+/g) || [];
  const tags = matches.map(tag => tag.slice(1)); // Убираем символ #
  return [...new Set(tags)]; // Убираем дубликаты
}

// Функция для очистки текста от тегов (чтобы в контенте не было #тегов)
function cleanContent(text) {
  return text.replace(/#[а-яА-Яa-zA-Z0-9_-]+/g, '').trim();
}

function notesModule(app, opts, done) {
  
  // Получить все заметки
  app.get('/notes', async (request, reply) => {
    const result = await db.query('SELECT * FROM notes ORDER BY created_at DESC');
    return { data: result.rows };
  });

  // Создать новую заметку
  app.post('/notes', async (request, reply) => {
    const { title, content } = request.body;
    
    // Извлекаем теги из контента (если они есть)
    const tags = extractTags(content || '');
    const cleanContentText = cleanContent(content || '');

    const result = await db.query(
      'INSERT INTO notes (title, content, tags) VALUES ($1, $2, $3) RETURNING *',
      [title || 'Без названия', cleanContentText, tags]
    );

    const newNote = result.rows[0];
    
    // Сообщаем системе о новой заметке (для будущих модулей)
    EventBus.emit('note:created', newNote);
    
    return { data: newNote };
  });

  // Удалить заметку по ID
  app.delete('/notes/:id', async (request, reply) => {
    const { id } = request.params;
    await db.query('DELETE FROM notes WHERE id = $1', [id]);
    return { success: true };
  });

  done();
}

export default notesModule;
