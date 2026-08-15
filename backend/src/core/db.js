// Ядро базы данных (Database Core)
// Модули не должны знать детали подключения.
// Они просто вызывают db.query(...)

import pg from 'pg';
const { Pool } = pg;

// Настройки подключения (совпадают с docker-compose.yml)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'analyst',
  password: process.env.DB_PASSWORD || 'secret_password',
  database: process.env.DB_NAME || 'notes',
  max: 10, // максимум соединений
  idleTimeoutMillis: 30000
});

// Функция для выполнения запросов
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`[DB] Запрос выполнен за ${duration} мс: ${text.substring(0, 80)}`);
  return result;
}

// Функция для инициализации таблиц (вызывается при старте сервера)
async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[DB] Схема инициализирована');
}

export default { query, initSchema };

