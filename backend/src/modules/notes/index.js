// Модуль "Заметки"
// Это наш первый "плагин". Он не знает про другие модули.
// Ядро просто регистрирует его маршруты.

import EventBus from '../../core/events.js';

// Пока заметки храним в памяти (потом перенесем в БД)
const notes = [
  {
    id: 1,
    title: 'Добро пожаловать',
    content: 'Это тестовая заметка. Скоро мы подключим Базу Данных.',
    createdAt: new Date().toISOString(),
    tags: ['старт']
  }
];

// Функция, которую вызовет Fastify для подключения модуля
function notesModule(app, opts, done) {
  
  // Маршрут: Получить все заметки
  app.get('/notes', async (request, reply) => {
    return { data: notes };
  });

  // Маршрут: Создать новую заметку
  app.post('/notes', async (request, reply) => {
    const { title, content, tags } = request.body;
    
    const newNote = {
      id: notes.length + 1,
      title: title || 'Без названия',
      content: content || '',
      createdAt: new Date().toISOString(),
      tags: tags || []
    };
    
    notes.push(newNote);
    
    // Отправляем событие в шину (кому надо — услышит)
    EventBus.emit('note:created', newNote);
    
    return { data: newNote };
  });

  done();
}

export default notesModule;

