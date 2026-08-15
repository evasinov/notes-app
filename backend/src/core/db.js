// Ядро базы данных (CommonJS)
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'analyst',
  password: 'secret_password',
  database: 'notes',
  max: 10,
  idleTimeoutMillis: 30000
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`[DB] Запрос выполнен за ${duration} мс: ${text.substring(0, 80)}`);
  return result;
}

async function initSchema() {
  // Создаем таблицу users (если нет)
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  // Создаем таблицу notes (если нет)
  await query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  // Добавляем колонку user_id, если её нет (для старых БД)
  await query(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
  `);
  
  console.log('[DB] Схема инициализирована');
}

module.exports = { query, initSchema };
