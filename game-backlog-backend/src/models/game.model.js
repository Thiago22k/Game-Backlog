const pool = require('../config/database');

const Game = {
  // Agregar juego a la lista del usuario
  async addGame(userId, igdbGameId, status = 'completed', rating = null) {
    const query = `
      INSERT INTO user_games (user_id, igdb_game_id, status, rating, completed_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const completedAt = status === 'completed' ? new Date() : null;
    const values = [userId, igdbGameId, status, rating, completedAt];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Obtener todos los juegos de un usuario
  async getUserGames(userId, status = null) {
    let query = 'SELECT * FROM user_games WHERE user_id = $1';
    const values = [userId];

    if (status) {
      query += ' AND status = $2 ORDER BY completed_at DESC, created_at DESC';
      values.push(status);
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, values);
    return result.rows;
  },

  // Obtener un juego específico del usuario
  async getUserGame(userId, igdbGameId) {
    const query = 'SELECT * FROM user_games WHERE user_id = $1 AND igdb_game_id = $2';
    const result = await pool.query(query, [userId, igdbGameId]);
    return result.rows[0];
  },

  // Actualizar estado y/o calificación
  async updateGame(userId, igdbGameId, status, rating) {
    const updates = [];
    const values = [userId, igdbGameId];
    let valueIndex = 3;

    if (status !== undefined) {
      updates.push(`status = $${valueIndex}`);
      values.push(status);
      valueIndex++;
      updates.push(`status_set_by = 'user'`);

      if (status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      } else {
        updates.push(`completed_at = NULL`);
      }
    }

    if (rating !== undefined) {
      updates.push(`rating = $${valueIndex}`);
      values.push(rating);
      valueIndex++;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
    UPDATE user_games 
    SET ${updates.join(', ')}
    WHERE user_id = $1 AND igdb_game_id = $2
    RETURNING *
  `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Eliminar juego de la lista del usuario
  async deleteGame(userId, igdbGameId) {
    const query = 'DELETE FROM user_games WHERE user_id = $1 AND igdb_game_id = $2 RETURNING *';
    const result = await pool.query(query, [userId, igdbGameId]);
    return result.rows[0];
  },

  // Verificar si un juego ya está en la lista del usuario
  async gameExists(userId, igdbGameId) {
    const query = 'SELECT id FROM user_games WHERE user_id = $1 AND igdb_game_id = $2';
    const result = await pool.query(query, [userId, igdbGameId]);
    return result.rows.length > 0;
  },

  // Aggregate community stats for a game (used in GameDetails page)
  async getGameStats(igdbGameId) {
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'playing')                       AS playing_count,
        COUNT(*) FILTER (WHERE status = 'completed')                     AS completed_count,
        COUNT(*) FILTER (WHERE status = 'backlog')                       AS backlog_count,
        COUNT(*) FILTER (WHERE status = 'wishlist')                      AS wishlist_count,
        COUNT(*) FILTER (WHERE status = 'dropped')                       AS dropped_count,
        COUNT(*) FILTER (WHERE rating IS NOT NULL)                       AS ratings_count,
        ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL)::numeric, 1) AS avg_rating,
        -- Distribution buckets
        COUNT(*) FILTER (WHERE rating = 0.5) AS r05,
        COUNT(*) FILTER (WHERE rating = 1.0) AS r10,
        COUNT(*) FILTER (WHERE rating = 1.5) AS r15,
        COUNT(*) FILTER (WHERE rating = 2.0) AS r20,
        COUNT(*) FILTER (WHERE rating = 2.5) AS r25,
        COUNT(*) FILTER (WHERE rating = 3.0) AS r30,
        COUNT(*) FILTER (WHERE rating = 3.5) AS r35,
        COUNT(*) FILTER (WHERE rating = 4.0) AS r40,
        COUNT(*) FILTER (WHERE rating = 4.5) AS r45,
        COUNT(*) FILTER (WHERE rating = 5.0) AS r50
      FROM user_games
      WHERE igdb_game_id = $1
    `;
    const likesQuery = 'SELECT COUNT(*) FROM game_likes WHERE igdb_game_id = $1';
    const collsQuery = `
      SELECT 
        COUNT(DISTINCT cg.collection_id) as total,
        COUNT(DISTINCT CASE WHEN c.is_public = true THEN cg.collection_id END) as public_count,
        COUNT(DISTINCT CASE WHEN c.is_public = false THEN cg.collection_id END) as private_count
      FROM collection_games cg
      JOIN collections c ON cg.collection_id = c.id
      WHERE cg.igdb_game_id = $1
    `;
    const reviewsQuery = 'SELECT COUNT(*) FROM reviews WHERE igdb_game_id = $1';

    const [statsRes, likesRes, collsRes, reviewsRes] = await Promise.all([
      pool.query(statsQuery, [igdbGameId]),
      pool.query(likesQuery, [igdbGameId]),
      pool.query(collsQuery, [igdbGameId]),
      pool.query(reviewsQuery, [igdbGameId]),
    ]);

    const s = statsRes.rows[0];
    const cStats = collsRes.rows[0];

    return {
      likes: parseInt(likesRes.rows[0].count, 10),
      playing: parseInt(s.playing_count, 10),
      completed: parseInt(s.completed_count, 10),
      backlog: parseInt(s.backlog_count, 10),
      wishlist: parseInt(s.wishlist_count, 10),
      dropped: parseInt(s.dropped_count, 10),
      ratingsCount: parseInt(s.ratings_count, 10),
      avgRating: s.avg_rating ? parseFloat(s.avg_rating) : 0,
      collectionsCount: parseInt(cStats.total, 10),
      collectionsPublic: parseInt(cStats.public_count, 10),
      collectionsPrivate: parseInt(cStats.private_count, 10),
      reviewsCount: parseInt(reviewsRes.rows[0].count, 10),
      ratingDistribution: [
        parseInt(s.r05, 10),
        parseInt(s.r10, 10),
        parseInt(s.r15, 10),
        parseInt(s.r20, 10),
        parseInt(s.r25, 10),
        parseInt(s.r30, 10),
        parseInt(s.r35, 10),
        parseInt(s.r40, 10),
        parseInt(s.r45, 10),
        parseInt(s.r50, 10)
      ]
    };
  },

  // Obtener usuarios por estadística de juego
  async getUsersByGameStat(igdbGameId, stat) {
    let query = '';
    const values = [igdbGameId];

    switch (stat) {
      case 'likes':
        query = `
          SELECT u.id, u.username, u.avatar_url, gl.created_at AS stat_date
          FROM game_likes gl
          JOIN users u ON gl.user_id = u.id
          WHERE gl.igdb_game_id = $1
          ORDER BY gl.created_at DESC
        `;
        break;
      case 'collections':
        query = `
          SELECT u.id, u.username, u.avatar_url, MIN(cg.created_at) AS stat_date
          FROM collection_games cg
          JOIN collections c ON cg.collection_id = c.id
          JOIN users u ON c.user_id = u.id
          WHERE cg.igdb_game_id = $1 AND c.is_public = true
          GROUP BY u.id, u.username, u.avatar_url
          ORDER BY stat_date DESC
        `;
        break;
      case 'reviews':
        query = `
          SELECT u.id, u.username, u.avatar_url, r.created_at AS stat_date, r.rating
          FROM reviews r
          JOIN users u ON r.user_id = u.id
          WHERE r.igdb_game_id = $1
          ORDER BY r.created_at DESC
        `;
        break;
      case 'playing':
      case 'completed':
      case 'backlog':
      case 'wishlist':
      case 'dropped':
        query = `
          SELECT u.id, u.username, u.avatar_url, ug.updated_at AS stat_date
          FROM user_games ug
          JOIN users u ON ug.user_id = u.id
          WHERE ug.igdb_game_id = $1 AND ug.status = $2
          ORDER BY ug.updated_at DESC
        `;
        values.push(stat);
        break;
      default:
        throw new Error('Stat type not supported');
    }

    const { rows } = await pool.query(query, values);
    return rows;
  }
};

module.exports = Game;