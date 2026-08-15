// Middleware для проверки JWT-токена
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'super-secret-key-change-me';

async function authMiddleware(request, reply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Требуется авторизация' });
  }

  const token = authHeader.slice(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded; // Добавляем пользователя в запрос
  } catch (err) {
    return reply.code(401).send({ error: 'Недействительный токен' });
  }
}

module.exports = authMiddleware;
