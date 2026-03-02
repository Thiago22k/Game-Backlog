const pool = require('../config/database');

const Review = {
    // 1. Crear una reseña
    async createReview(userId, igdbGameId, rating, status, subStatus, platform, containsSpoiler, content) {
        const query = `
            INSERT INTO reviews (user_id, igdb_game_id, rating, status, sub_status, platform, contains_spoiler, content, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [userId, igdbGameId, rating, status, subStatus, platform, containsSpoiler, content];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // 2. Obtener la reseña de un usuario para un juego específico
    async getUserReviewForGame(userId, igdbGameId) {
        const query = `
            SELECT r.*, u.username, u.avatar_url, u.avatar_static_url,
                   (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                   (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count,
                   EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = $1) as has_liked
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.user_id = $1 AND r.igdb_game_id = $2
        `;
        const result = await pool.query(query, [userId, igdbGameId]);
        return result.rows[0];
    },

    // 3. Revisar si existe una reseña de un usuario para un juego
    async reviewExists(userId, igdbGameId) {
        const query = 'SELECT id FROM reviews WHERE user_id = $1 AND igdb_game_id = $2';
        const result = await pool.query(query, [userId, igdbGameId]);
        return result.rows.length > 0;
    },

    // 4. Actualizar una reseña
    async updateReview(userId, igdbGameId, rating, status, subStatus, platform, containsSpoiler, content) {
        const query = `
            UPDATE reviews 
            SET rating = $1, status = $2, sub_status = $3, platform = $4, contains_spoiler = $5, content = $6, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $7 AND igdb_game_id = $8
            RETURNING *
        `;
        const values = [rating, status, subStatus, platform, containsSpoiler, content, userId, igdbGameId];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // 5. Borrar una reseña
    async deleteReview(userId, igdbGameId) {
        const query = 'DELETE FROM reviews WHERE user_id = $1 AND igdb_game_id = $2 RETURNING *';
        const result = await pool.query(query, [userId, igdbGameId]);
        return result.rows[0];
    },

    // 5.b Borrar una reseña por su ID (Admin)
    async deleteReviewById(reviewId) {
        const query = 'DELETE FROM reviews WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [reviewId]);
        return result.rows[0];
    },

    // 6. Obtener las reseñas de un juego determinado
    async getReviewsByGame(igdbGameId, currentUserId = null, limit = 10, offset = 0) {
        const query = `
            SELECT r.*, 
                   u.username, u.avatar_url, u.avatar_static_url,
                   (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                   (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count
                   ${currentUserId ? `, EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = $3) as has_liked` : ''}
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.igdb_game_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $4
        `;
        const values = currentUserId ? [igdbGameId, limit, currentUserId, offset] : [igdbGameId, limit, offset, offset];
        // En PgSQL, si currentUserId es null la consulta requerirá un array de [igdbGameId, limit, offset] e ignorará el parameter $4.
        // Let's refactor the array values to avoid issues stringifying pg query params.

        let execQuery = query;
        let execValues = [];
        if (currentUserId) {
            execQuery = `
                SELECT r.*, 
                   u.username, u.avatar_url, u.avatar_static_url,
                   (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                   (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count,
                   EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = $3) as has_liked
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.igdb_game_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $4
            `;
            execValues = [igdbGameId, limit, currentUserId, offset];
        } else {
            execQuery = `
                 SELECT r.*, 
                   u.username, u.avatar_url, u.avatar_static_url,
                   (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                   (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count,
                   false as has_liked
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.igdb_game_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
            `;
            execValues = [igdbGameId, limit, offset];
        }

        const result = await pool.query(execQuery, execValues);
        return result.rows;
    },

    // 7. Toggle Like
    async toggleLike(reviewId, userId) {
        const checkQuery = 'SELECT id FROM review_likes WHERE review_id = $1 AND user_id = $2';
        const checkResult = await pool.query(checkQuery, [reviewId, userId]);

        if (checkResult.rows.length > 0) {
            await pool.query('DELETE FROM review_likes WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
            return { liked: false };
        } else {
            await pool.query('INSERT INTO review_likes (review_id, user_id) VALUES ($1, $2)', [reviewId, userId]);
            return { liked: true };
        }
    },

    // 8. Crear un comentario (Respuesta) en una reseña
    async addComment(reviewId, userId, content) {
        const query = `
            WITH inserted_comment AS (
                INSERT INTO review_comments (review_id, user_id, content, created_at, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            )
            SELECT ic.*, u.username, u.avatar_url, u.avatar_static_url
            FROM inserted_comment ic
            JOIN users u ON ic.user_id = u.id
        `;
        const result = await pool.query(query, [reviewId, userId, content]);
        return result.rows[0];
    },

    // 9. Obtener los comentarios de una reseña
    async getComments(reviewId) {
        const query = `
            SELECT rc.*, u.username, u.avatar_url, u.avatar_static_url
            FROM review_comments rc
            JOIN users u ON rc.user_id = u.id
            WHERE rc.review_id = $1
            ORDER BY rc.created_at ASC
        `;
        const result = await pool.query(query, [reviewId]);
        return result.rows;
    },

    // 10. Eliminar un comentario
    async deleteComment(commentId, userId) {
        const query = 'DELETE FROM review_comments WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(query, [commentId, userId]);
        return result.rows[0];
    },

    // 11. Reportar una reseña
    async reportReview(reviewId, userId, reason) {
        const checkQuery = 'SELECT id FROM review_reports WHERE review_id = $1 AND user_id = $2';
        const checkResult = await pool.query(checkQuery, [reviewId, userId]);
        if (checkResult.rows.length > 0) {
            throw new Error("Ya has reportado esta reseña anteriormente.");
        }

        const query = `
            INSERT INTO review_reports (review_id, user_id, reason, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const result = await pool.query(query, [reviewId, userId, reason]);
        return result.rows[0];
    },

    // 11.5 Reportar un comentario de reseña
    async reportComment(commentId, userId, reason, details) {
        const checkQuery = 'SELECT id FROM review_comment_reports WHERE comment_id = $1 AND user_id = $2 AND status = $3';
        const existing = await pool.query(checkQuery, [commentId, userId, 'pending']);

        if (existing.rows.length > 0) {
            throw new Error("Ya has reportado este comentario y el reporte sigue pendiente de revisión.");
        }

        const query = `
            INSERT INTO review_comment_reports (comment_id, user_id, reason, details)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [commentId, userId, reason, details || null]);
        return result.rows[0];
    },

    // 12. Obtener reseñas recientes (para Landing/Explore)
    async getRecentReviews(limit = 10, currentUserId = null) {
        let query = '';
        let values = [];

        if (currentUserId) {
            query = `
                 SELECT r.*, 
                        u.username, u.avatar_url, u.avatar_static_url,
                        g.name as game_name, g.slug as game_slug,
                        (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                        (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count,
                        EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = $2) as has_liked
                 FROM reviews r
                 JOIN users u ON r.user_id = u.id
                 LEFT JOIN igdb_cache g ON r.igdb_game_id = g.igdb_id
                 ORDER BY r.created_at DESC
                 LIMIT $1
             `;
            values = [limit, currentUserId];
        } else {
            query = `
                 SELECT r.*, 
                        u.username, u.avatar_url, u.avatar_static_url,
                        g.name as game_name, g.slug as game_slug,
                        (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                        (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count,
                        false as has_liked
                 FROM reviews r
                 JOIN users u ON r.user_id = u.id
                 LEFT JOIN igdb_cache g ON r.igdb_game_id = g.igdb_id
                 ORDER BY r.created_at DESC
                 LIMIT $1
             `;
            values = [limit];
        }

        const result = await pool.query(query, values);
        return result.rows;
    },

    // 13. Obtener reseñas populares (para Landing/Explore)
    async getPopularReviews(limit = 10, currentUserId = null) {
        let query = '';
        let values = [];

        if (currentUserId) {
            query = `
                SELECT r.*, 
                       u.username, u.avatar_url, u.avatar_static_url,
                       g.name as game_name, g.slug as game_slug,
                       (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                       (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count,
                       EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = $2) as has_liked
                FROM reviews r
                JOIN users u ON r.user_id = u.id
                LEFT JOIN igdb_cache g ON r.igdb_game_id = g.igdb_id
                ORDER BY likes_count DESC, r.created_at DESC
                LIMIT $1
            `;
            values = [limit, currentUserId];
        } else {
            query = `
                SELECT r.*, 
                       u.username, u.avatar_url, u.avatar_static_url,
                       g.name as game_name, g.slug as game_slug,
                       (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) as likes_count,
                       (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count,
                       false as has_liked
                FROM reviews r
                JOIN users u ON r.user_id = u.id
                LEFT JOIN igdb_cache g ON r.igdb_game_id = g.igdb_id
                ORDER BY likes_count DESC, r.created_at DESC
                LIMIT $1
            `;
            values = [limit];
        }

        const result = await pool.query(query, values);
        return result.rows;
    },

    // 14. Obtener la reseña por ID
    async getReviewById(reviewId) {
        const query = `
           SELECT r.*, u.username, u.avatar_url, u.avatar_static_url
           FROM reviews r
           JOIN users u ON r.user_id = u.id
           WHERE r.id = $1
       `;
        const result = await pool.query(query, [reviewId]);
        return result.rows[0];
    },

    // 15. Obtener el conteo de reseñas por nombre de usuario
    async getReviewCountByUsername(username) {
        const query = `
            SELECT COUNT(*) 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE u.username ILIKE $1
        `;
        const result = await pool.query(query, [username]);
        return parseInt(result.rows[0].count, 10);
    }
};

module.exports = Review;
