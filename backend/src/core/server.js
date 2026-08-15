import Fastify from 'fastify';
import EventBus from './events.js';
import db from './db.js';
import notesModule from '../modules/notes/index.js';
import searchModule from '../modules/search/index.js';

const app = Fastify({ logger: true });
const PORT = 3333;

app.get('/health', async () => {
  return { status: 'ok', service: 'smart-notes' };
});

async function loadModules() {
  console.log('[Core] Инициализируем базу данных...');
  await db.initSchema();
  
  console.log('[Core] Подключаем модули...');
  app.register(notesModule);
  console.log('[Core] Модуль "Заметки" подключен');
  app.register(searchModule);
  console.log('[Core] Модуль "Поиск" подключен');
}

async function start() {
  try {
    await loadModules();
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Core] Сервер запущен на http://0.0.0.0:${PORT}`);
    EventBus.emit('server:started', { port: PORT });
  } catch (err) {
    console.error('[Core] Ошибка запуска:', err);
    process.exit(1);
  }
}

start();
