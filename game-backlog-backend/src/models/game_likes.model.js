const pool = require('../config/database');

const GameLikes = {
    // Toggle a like for a game (like/unlike)
    async toggleLike(igdbGameId, userId) {
        const query = `
            WITH deleted AS (
                DELETE FROM game_likes 
                WHERE igdb_game_id = $1 AND user_id = $2 
                RETURNING id
            ), inserted AS (
                INSERT INTO game_likes (igdb_game_id, user_id)
                SELECT $1, $2 
                WHERE NOT EXISTS (SELECT 1 FROM deleted)
                RETURNING id
            )
            SELECT 'deleted' AS action FROM deleted
            UNION ALL
            SELECT 'inserted' AS action FROM inserted;
        `;
        const result = await pool.query(query, [igdbGameId, userId]);

        return { liked: result.rows[0].action === 'inserted' };
    },

    // Get total like count for a game
    async getLikeCount(igdbGameId) {
        const query = 'SELECT COUNT(*) FROM game_likes WHERE igdb_game_id = $1';
        const result = await pool.query(query, [igdbGameId]);
        return parseInt(result.rows[0].count, 10);
    },

    // Check if a specific user has liked a game
    async hasUserLiked(igdbGameId, userId) {
        if (!userId) return false;
        const query = 'SELECT id FROM game_likes WHERE igdb_game_id = $1 AND user_id = $2';
        const result = await pool.query(query, [igdbGameId, userId]);
        return result.rows.length > 0;
    },

    // Get bulk like count and user status for multiple games
    async getBulkLikeStatus(igdbGameIds, userId) {
        if (!igdbGameIds || igdbGameIds.length === 0) return {};

        // Ensure ids are integers to prevent SQL injection issues if any string passes
        const safeIds = igdbGameIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (safeIds.length === 0) return {};

        const countsQuery = `
            SELECT igdb_game_id, COUNT(*) as likes_count
            FROM game_likes
            WHERE igdb_game_id = ANY($1::int[])
            GROUP BY igdb_game_id
        `;

        const userLikesQuery = userId ? `
            SELECT igdb_game_id
            FROM game_likes
            WHERE igdb_game_id = ANY($1::int[]) AND user_id = $2
        ` : null;

        const [countsResult, userLikesResult] = await Promise.all([
            pool.query(countsQuery, [safeIds]),
            userId ? pool.query(userLikesQuery, [safeIds, userId]) : { rows: [] }
        ]);

        const userLikedSet = new Set(userLikesResult.rows.map(r => r.igdb_game_id));
        const results = {};

        safeIds.forEach(id => {
            results[id] = { likes_count: 0, user_has_liked: userLikedSet.has(id) };
        });

        countsResult.rows.forEach(row => {
            if (results[row.igdb_game_id]) {
                results[row.igdb_game_id].likes_count = parseInt(row.likes_count, 10);
            }
        });

        return results;
    },

    // Get list of liked game IDs for a specific user  
    async getLikedGamesByUser(userId) {
        const query = 'SELECT igdb_game_id, created_at FROM game_likes WHERE user_id = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Get list of liked game IDs for a user by username (join with users table)
    async getLikedGamesByUsername(username) {
        const query = `
            SELECT gl.igdb_game_id, gl.created_at
            FROM game_likes gl
            JOIN users u ON gl.user_id = u.id
            WHERE u.username ILIKE $1
            ORDER BY gl.created_at DESC
        `;
        const result = await pool.query(query, [username]);
        return result.rows;
    },

    // Get total likes count across all games for a user (statistic)
    async getTotalLikesByUser(userId) {
        const query = 'SELECT COUNT(*) FROM game_likes WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count, 10);
    }
};

module.exports = GameLikes;
