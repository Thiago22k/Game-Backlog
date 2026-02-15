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

      // Si cambia a completed, actualizar completed_at
      if (status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
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
};

module.exports = Game;