const pool = require('../config/database');

const User = {
  // Crear un nuevo usuario
  async create(username, email, hashedPassword) {
    const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
    `;
    const values = [username, email, hashedPassword];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Buscar usuario por email
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  // Buscar usuario por username
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  },

  // Buscar usuario por ID
  async findById(id) {
    const query = 'SELECT id, username, email, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Cambiar contraseña
async changePassword(userId, newHashedPassword) {
  const query = `
    UPDATE users 
    SET password = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2
    RETURNING id, username, email
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
    RETURNING id, username, email
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
    RETURNING id, username, email, last_username_change
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

// Eliminar cuenta
async deleteUser(userId) {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [userId]);
  return result.rows[0];
},
};



module.exports = User;