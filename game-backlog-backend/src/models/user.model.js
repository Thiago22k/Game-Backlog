const pool = require('../config/database');

const HANDLE_REGEX = /^[a-zA-Z0-9_.#-]*$/;

const sanitizeAndValidateHandle = (val, maxLen, fieldLabel) => {
  if (val === undefined || val === null) return null;
  if (typeof val !== 'string') {
    const err = new Error(`Formato inválido para ${fieldLabel}`);
    err.statusCode = 400;
    throw err;
  }

  let cleaned = val.trim();
  if (!cleaned) return null;

  // Si enviaron una URL completa, extraer solo el usuario final
  cleaned = cleaned
    .replace(/^https?:\/\/(www\.)?(twitch\.tv|discord\.com\/users|steamcommunity\.com\/(id|profiles))\//i, '')
    .replace(/\/+$/, '')
    .replace(/^@+/, '');

  if (cleaned.length > maxLen) {
    const err = new Error(`${fieldLabel} no puede superar los ${maxLen} caracteres`);
    err.statusCode = 400;
    throw err;
  }

  if (!HANDLE_REGEX.test(cleaned)) {
    const err = new Error(`${fieldLabel} contiene caracteres no permitidos`);
    err.statusCode = 400;
    throw err;
  }

  return cleaned;
};

const User = {
  // Crear un nuevo usuario tradicional
  async create(username, email, hashedPassword) {
    const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, role, is_profile_public, avatar_url, avatar_static_url, banner_url, (password IS NOT NULL) AS has_password, created_at
    `;
    const values = [username, email, hashedPassword];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Crear usuario nuevo desde Steam OpenID (password = NULL, email opcional)
  async createSteamUser({ username, email = null, steamId64, profile = {} }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userQuery = `
        INSERT INTO users (username, email, password, avatar_url)
        VALUES ($1, $2, NULL, $3)
        RETURNING id, username, email, role, is_profile_public, avatar_url, avatar_static_url, banner_url, bio, social_twitch, social_discord, social_steam, (password IS NOT NULL) AS has_password, created_at
      `;
      const userResult = await client.query(userQuery, [
        username,
        email || null,
        profile.avatar_url || null,
      ]);
      const user = userResult.rows[0];

      const steamQuery = `
        INSERT INTO steam_accounts (user_id, steam_id64, persona_name, avatar_url, profile_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      await client.query(steamQuery, [
        user.id,
        steamId64,
        profile.persona_name || null,
        profile.avatar_url || null,
        profile.profile_url || null,
      ]);

      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Buscar usuario por email
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  // Buscar usuario por username (case-insensitive)
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username ILIKE $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  },

  // Buscar usuario por ID
  async findById(id) {
    const query = `
      SELECT id, username, email, role, status, is_profile_public,
             avatar_url, avatar_static_url, banner_url, bio,
             social_twitch, social_discord, social_steam,
             (password IS NOT NULL) AS has_password, created_at
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Buscar usuario por ID con contraseña (uso interno Auth/Settings)
  async findByIdWithPassword(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Cambiar o establecer contraseña
  async changePassword(userId, newHashedPassword) {
    const query = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING id, username, email, avatar_url, avatar_static_url, banner_url, (password IS NOT NULL) AS has_password
    `;
    const result = await pool.query(query, [newHashedPassword, userId]);
    return result.rows[0];
  },

  // Actualizar email
  async updateEmail(userId, newEmail) {
    const query = `
      UPDATE users 
      SET email = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING id, username, email, avatar_url, avatar_static_url, banner_url
    `;
    const result = await pool.query(query, [newEmail, userId]);
    return result.rows[0];
  },

  // Actualizar username
  async updateUsername(userId, newUsername) {
    const query = `
      UPDATE users 
      SET username = $1, last_username_change = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING id, username, email, avatar_url, avatar_static_url, banner_url, last_username_change
    `;
    const result = await pool.query(query, [newUsername, userId]);
    return result.rows[0];
  },

  // Verificar cuándo fue el último cambio de username
  async getLastUsernameChange(userId) {
    const query = 'SELECT last_username_change FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.last_username_change;
  },

  // Actualizar visibilidad del perfil
  async updateProfileVisibility(userId, isPublic) {
    const query = `
      UPDATE users 
      SET is_profile_public = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING id, username, email, avatar_url, avatar_static_url, banner_url, is_profile_public
    `;
    const result = await pool.query(query, [isPublic, userId]);
    return result.rows[0];
  },

  // Eliminar cuenta
  async deleteUser(userId) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  // Banear usuario (Soft delete)
  async banUser(userId) {
    const query = `
      UPDATE users 
      SET status = 'banned', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING id, username, email, status
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  // Actualizar avatar
  async updateAvatar(userId, avatarUrl, avatarStaticUrl = null) {
    const query = `
      UPDATE users 
      SET avatar_url = $1, avatar_static_url = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3
      RETURNING id, username, email, avatar_url, avatar_static_url, banner_url
    `;
    const result = await pool.query(query, [avatarUrl, avatarStaticUrl, userId]);
    return result.rows[0];
  },

  // Actualizar banner
  async updateBanner(userId, bannerUrl) {
    const query = `
      UPDATE users 
      SET banner_url = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING id, username, email, avatar_url, avatar_static_url, banner_url
    `;
    const result = await pool.query(query, [bannerUrl, userId]);
    return result.rows[0];
  },

  // Actualizar bio y redes sociales (con validación estricta de longitud y caracteres)
  async updateProfile(userId, { bio, social_twitch, social_discord, social_steam }) {
    let cleanBio = null;
    if (bio !== undefined && bio !== null) {
      if (typeof bio !== 'string') {
        const err = new Error('Formato inválido para la biografía');
        err.statusCode = 400;
        throw err;
      }
      const trimmedBio = bio.trim();
      if (trimmedBio.length > 40) {
        const err = new Error('La biografía no puede superar los 40 caracteres');
        err.statusCode = 400;
        throw err;
      }
      cleanBio = trimmedBio || null;
    }

    const cleanTwitch = sanitizeAndValidateHandle(social_twitch, 25, 'Twitch');
    const cleanDiscord = sanitizeAndValidateHandle(social_discord, 32, 'Discord');
    const cleanSteam = sanitizeAndValidateHandle(social_steam, 32, 'Steam');

    const query = `
      UPDATE users
      SET bio = $1, social_twitch = $2, social_discord = $3, social_steam = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, username, email, avatar_url, avatar_static_url, banner_url, bio, social_twitch, social_discord, social_steam
    `;
    const result = await pool.query(query, [cleanBio, cleanTwitch, cleanDiscord, cleanSteam, userId]);
    return result.rows[0];
  },

  // Reportar un perfil de usuario
  async reportProfile(reportedUserId, reporterId, reason, details) {
    const checkQuery = 'SELECT id FROM profile_reports WHERE reported_user_id = $1 AND reporter_id = $2 AND status = $3';
    const existing = await pool.query(checkQuery, [reportedUserId, reporterId, 'pending']);

    if (existing.rows.length > 0) {
      throw new Error("Ya has reportado a este usuario y el reporte sigue pendiente de revisión.");
    }

    const query = `
      INSERT INTO profile_reports (reported_user_id, reporter_id, reason, details)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [reportedUserId, reporterId, reason, details || null]);
    return result.rows[0];
  }
};

module.exports = User;