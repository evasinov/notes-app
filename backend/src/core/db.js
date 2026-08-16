const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'analyst',
  password: process.env.DB_PASSWORD || 'secret_password',
  database: process.env.DB_NAME || 'notes',
  max: 10,
  idleTimeoutMillis: 30000
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`[DB] Запрос за ${duration} мс: ${text.substring(0, 80)}`);
  return result;
}

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  await query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  await query(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
  `);

  await query(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
  `);

  // Таблица связей между заметками (для графа)
  await query(`
    CREATE TABLE IF NOT EXISTS note_links (
      id SERIAL PRIMARY KEY,
      source_note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
      target_note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source_note_id, target_note_id)
    );
  `);
  
  console.log('[DB] Схема инициализирована');
}

module.exports = { query, initSchema };
