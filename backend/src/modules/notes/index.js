// Модуль "Заметки"
// Работает с БД через ядро db.js
import EventBus from '../../core/events.js';
import db from '../../core/db.js';

function notesModule(app, opts, done) {
  
  // Получить все заметки (сортировка по дате создания)
  app.get('/notes', async (request, reply) => {
    const result = await db.query('SELECT * FROM notes ORDER BY created_at DESC');
    return { data: result.rows };
  });

  // Создать новую заметку
  app.post('/notes', async (request, reply) => {
    const { title, content, tags } = request.body;
    
    // Если теги пришли строкой, превращаем в массив
    let tagsArray = tags;
    if (typeof tags === 'string') {
      tagsArray = tags.split(',').map(t => t.trim());
    }

    const result = await db.query(
      'INSERT INTO notes (title, content, tags) VALUES ($1, $2, $3) RETURNING *',
      [title || 'Без названия', content || '', tagsArray || []]
    );

    const newNote = result.rows[0];
    
    // Сообщаем системе о новой заметке
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
