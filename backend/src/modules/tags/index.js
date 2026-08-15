const db = require('../../core/db.js');
const authMiddleware = require('../../core/auth-middleware.js');

function tagsModule(app, opts, done) {
  
  app.get('/tags/stats', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const result = await db.query(`
        SELECT tag, COUNT(*) as count
        FROM notes n
        CROSS JOIN LATERAL unnest(COALESCE(n.tags, ARRAY[]::TEXT[])) as tag
        WHERE n.user_id = $1
        GROUP BY tag
        ORDER BY count DESC
      `, [request.user.id]);
      
      return { data: result.rows };
    } catch (err) {
      console.error('[Tags] Ошибка:', err.message);
      return { data: [] };
    }
  });

  done();
}

module.exports = tagsModule;
