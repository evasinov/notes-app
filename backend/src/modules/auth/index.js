// Модуль "Авторизация" (CommonJS)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../core/db.js');

const JWT_SECRET = 'super-secret-key-change-me';

function authModule(app, opts, done) {
  app.post('/auth/register', async (request, reply) => {
    const { username, password } = request.body;
    if (!username || !password) {
      return reply.code(400).send({ error: 'Логин и пароль обязательны' });
    }

    const hash = await bcrypt.hash(password, 10);
    
    try {
      const result = await db.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
        [username, hash]
      );
      return { data: result.rows[0] };
    } catch (err) {
      return reply.code(409).send({ error: 'Пользователь уже существует' });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body;
    
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    
    if (!user) {
      return reply.code(401).send({ error: 'Неверный логин или пароль' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user: { id: user.id, username: user.username } };
  });

  done();
}

module.exports = authModule;
