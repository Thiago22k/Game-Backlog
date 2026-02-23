const pool = require('../config/database');

const GameLikes = {
    // Toggle a like for a game (like/unlike)
    async toggleLike(igdbGameId, userId) {
        const checkQuery = 'SELECT id FROM game_likes WHERE igdb_game_id = $1 AND user_id = $2';
        const checkResult = await pool.query(checkQuery, [igdbGameId, userId]);

        if (checkResult.rows.length > 0) {
            await pool.query('DELETE FROM game_likes WHERE igdb_game_id = $1 AND user_id = $2', [igdbGameId, userId]);
            return { liked: false };
        } else {
            await pool.query('INSERT INTO game_likes (igdb_game_id, user_id) VALUES ($1, $2)', [igdbGameId, userId]);
            return { liked: true };
        }
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

    // Get list of liked game IDs for a specific user  
    async getLikedGamesByUser(userId) {
        const query = 'SELECT igdb_game_id, created_at FROM game_likes WHERE user_id = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);
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
