const pool = require('../config/database');

const Activity = {
    // Log a new activity
    async logActivity(userId, actionType, entityType, entityId, metadata = {}) {
        try {
            const query = `
        INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `;
            const values = [userId, actionType, entityType, entityId, JSON.stringify(metadata)];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (err) {
            // We don't want activity logging failures to crash main operations
            console.error('Failed to log activity:', err);
            return null;
        }
    },

    // Get activity history for a specific user
    async getUserActivity(userId, limit = 20) {
        const query = `
      SELECT * FROM activity_logs 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
        const result = await pool.query(query, [userId, limit]);
        return result.rows;
    }
};

module.exports = Activity;
