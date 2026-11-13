const pool = require('../config/database');

const SteamAccount = {
  async findByUserId(userId) {
    const result = await pool.query('SELECT * FROM steam_accounts WHERE user_id = $1', [userId]);
    return result.rows[0];
  },

  async findBySteamId(steamId64) {
    const result = await pool.query('SELECT * FROM steam_accounts WHERE steam_id64 = $1', [steamId64]);
    return result.rows[0];
  },

  // Lanza el error 23505 de Postgres si el usuario o el SteamID ya están vinculados
  // (las restricciones UNIQUE son la defensa real contra carreras).
  async create(userId, steamId64, profile = {}) {
    const query = `
      INSERT INTO steam_accounts (user_id, steam_id64, persona_name, avatar_url, profile_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      steamId64,
      profile.persona_name || null,
      profile.avatar_url || null,
      profile.profile_url || null,
    ]);
    return result.rows[0];
  },

  // Desvincula. El espejo de biblioteca/logros se elimina; los juegos ya agregados
  // a user_games se conservan (decisión por defecto, ver plan.md §15).
  async unlink(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM steam_library WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_steam_achievements WHERE user_id = $1', [userId]);
      const result = await client.query('DELETE FROM steam_accounts WHERE user_id = $1 RETURNING *', [userId]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = SteamAccount;
