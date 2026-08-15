import Fastify from 'fastify';
import EventBus from './events.js';
import notesModule from '../modules/notes/index.js';

const app = Fastify({ logger: true });
const PORT = 3333;

app.get('/health', async () => {
  return { status: 'ok', service: 'smart-notes' };
});

async function loadModules() {
  console.log('[Core] Подключаем модули...');
  
  // Подключаем модуль "Заметки"
  app.register(notesModule);
  
  console.log('[Core] Модуль "Заметки" подключен');
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
