// Ядро (CommonJS)
const Fastify = require('fastify');
const EventBus = require('./events.js');
const db = require('./db.js');
const notesModule = require('../modules/notes/index.js');
const searchModule = require('../modules/search/index.js');
const authModule = require('../modules/auth/index.js');
const tagsModule = require('../modules/tags/index.js');

const app = Fastify({ logger: true });
const PORT = 3333;

app.get('/health', async () => {
  return { status: 'ok', service: 'smart-notes' };
});

async function loadModules() {
  console.log('[Core] Инициализируем базу данных...');
  await db.initSchema();
  
  console.log('[Core] Подключаем модули...');
  app.register(authModule);
  console.log('[Core] Модуль "Авторизация" подключен');
  
  app.register(notesModule);
  console.log('[Core] Модуль "Заметки" подключен');
  
  app.register(searchModule);
  console.log('[Core] Модуль "Поиск" подключен');

  app.register(tagsModule);
  console.log('[Core] Модуль "Теги" подключен');
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
