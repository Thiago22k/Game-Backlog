const pool = require('../config/database');

// Auto-create table on first import
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id           SERIAL PRIMARY KEY,
                recipient_id INT REFERENCES users(id) ON DELETE CASCADE,
                actor_id     INT REFERENCES users(id) ON DELETE CASCADE,
                type         TEXT NOT NULL,
                entity_id    TEXT NOT NULL,
                metadata     JSONB DEFAULT '{}',
                is_read      BOOLEAN DEFAULT false,
                created_at   TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient
                ON notifications(recipient_id, is_read, created_at DESC);
        `);
    } catch (err) {
        console.error('Error creating notifications table:', err.message);
    }
})();

const Notification = {

    // Insert a new notification (skip if actor === recipient)
    async createNotification({ recipientId, actorId, type, entityId, metadata = {} }) {
        if (recipientId === actorId) return null; // Don't notify yourself
        const query = `
            INSERT INTO notifications (recipient_id, actor_id, type, entity_id, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [recipientId, actorId, type, entityId, metadata]);
        return result.rows[0];
    },

    // Get recent notifications for a user (last 30), enriched with actor info
    async getRecentForUser(userId) {
        const query = `
            SELECT n.*,
                   u.username   AS actor_username,
                   u.avatar_url AS actor_avatar_url
            FROM notifications n
            JOIN users u ON n.actor_id = u.id
            WHERE n.recipient_id = $1
            ORDER BY n.created_at DESC
            LIMIT 30
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Count unread notifications
    async countUnread(userId) {
        const result = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false',
            [userId]
        );
        return parseInt(result.rows[0].count, 10);
    },

    // Mark all notifications as read for a user
    async markAllRead(userId) {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false',
            [userId]
        );
    },

    // Mark a single notification as read
    async markOneRead(notificationId, userId) {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2',
            [notificationId, userId]
        );
    },
};

module.exports = Notification;
