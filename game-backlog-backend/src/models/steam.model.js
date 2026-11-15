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

  async updateSyncState(userId, { libraryVisible, syncStatus }) {
    const query = `
      UPDATE steam_accounts
      SET library_visible = COALESCE($2, library_visible),
          last_sync_at = CURRENT_TIMESTAMP,
          last_sync_status = $3
      WHERE user_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [userId, libraryVisible, syncStatus]);
    return result.rows[0];
  },

  async updateAutoSync(userId, autoSync) {
    const query = `
      UPDATE steam_accounts
      SET auto_sync = $2
      WHERE user_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [userId, Boolean(autoSync)]);
    return result.rows[0];
  },

  async getAccountsDueForAutoSync(limit = 20) {
    const query = `
      SELECT *
      FROM steam_accounts
      WHERE auto_sync = true
        AND library_visible = true
        AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '20 hours')
      ORDER BY last_sync_at ASC NULLS FIRST
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  },

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

  // --- STEAM LIBRARY (espejo por usuario) ---
  async upsertLibraryBatch(userId, games = []) {
    if (!games.length) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        INSERT INTO steam_library (
          user_id, steam_appid, name, playtime_minutes, playtime_2weeks_min, last_played_at, last_seen_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, steam_appid) DO UPDATE SET
          name = EXCLUDED.name,
          playtime_minutes = EXCLUDED.playtime_minutes,
          playtime_2weeks_min = EXCLUDED.playtime_2weeks_min,
          last_played_at = COALESCE(EXCLUDED.last_played_at, steam_library.last_played_at),
          last_seen_at = CURRENT_TIMESTAMP
      `;
      for (const g of games) {
        await client.query(query, [
          userId,
          g.steam_appid,
          g.name,
          g.playtime_minutes || 0,
          g.playtime_2weeks_min || 0,
          g.last_played_at || null,
        ]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getUserLibrary(userId) {
    const result = await pool.query(
      'SELECT * FROM steam_library WHERE user_id = $1 ORDER BY playtime_minutes DESC, name ASC',
      [userId]
    );
    return result.rows;
  },

  async setIgnoredAppIds(userId, appIds = [], ignored = true) {
    if (!appIds.length) return;
    await pool.query(
      'UPDATE steam_library SET ignored = $3 WHERE user_id = $1 AND steam_appid = ANY($2::int[])',
      [userId, appIds, ignored]
    );
  },

  // --- STEAM_IGDB_MAP (caché global compartida entre usuarios) ---
  async getMappingsByAppIds(appIds = []) {
    if (!appIds.length) return [];
    const result = await pool.query(
      'SELECT * FROM steam_igdb_map WHERE steam_appid = ANY($1::int[])',
      [appIds]
    );
    return result.rows;
  },

  async upsertMappingsBatch(entries = []) {
    if (!entries.length) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        INSERT INTO steam_igdb_map (steam_appid, igdb_game_id, match_status, resolved_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (steam_appid) DO UPDATE SET
          igdb_game_id = EXCLUDED.igdb_game_id,
          match_status = EXCLUDED.match_status,
          resolved_at = CURRENT_TIMESTAMP
      `;
      for (const e of entries) {
        await client.query(query, [e.steam_appid, e.igdb_game_id ?? null, e.match_status]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = SteamAccount;