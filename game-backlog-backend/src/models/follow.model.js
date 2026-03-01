const pool = require('../config/database');

const Follow = {
  // Crear la tabla de follows si no existe
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INT REFERENCES users(id) ON DELETE CASCADE,
        following_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );
    `;
    await pool.query(query);
  },

  async followUser(followerId, followingId) {
    const query = `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await pool.query(query, [followerId, followingId]);
    return result.rows[0];
  },

  async unfollowUser(followerId, followingId) {
    const query = `
      DELETE FROM follows 
      WHERE follower_id = $1 AND following_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [followerId, followingId]);
    return result.rows[0];
  },

  async isFollowing(followerId, followingId) {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = $1 AND following_id = $2
      )
    `;
    const result = await pool.query(query, [followerId, followingId]);
    return result.rows[0].exists;
  },

  async getFollowers(userId, callerId = null) {
    const query = `
      SELECT u.id, u.username, u.avatar_url, u.avatar_static_url, f.created_at as followed_at,
      EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = $2 AND f2.following_id = u.id) as is_following_by_me
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
    `;
    const result = await pool.query(query, [userId, callerId]);
    return result.rows;
  },

  async getFollowing(userId, callerId = null) {
    const query = `
      SELECT u.id, u.username, u.avatar_url, u.avatar_static_url, f.created_at as followed_at,
      EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = $2 AND f2.following_id = u.id) as is_following_by_me
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
    `;
    const result = await pool.query(query, [userId, callerId]);
    return result.rows;
  },

  async getFollowCounts(userId) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count
    `;
    const result = await pool.query(query, [userId]);
    return {
      followers: parseInt(result.rows[0].followers_count, 10),
      following: parseInt(result.rows[0].following_count, 10),
    };
  }
};

// Crear la tabla al iniciar
Follow.createTable().catch(err => console.error('Error creating follows table', err));

module.exports = Follow;
