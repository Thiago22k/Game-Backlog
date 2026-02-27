const pool = require('../config/database');

const Collection = {
    // Crear una nueva colección
    async createCollection(userId, title, description = '', isPublic = true) {
        const query = `
      INSERT INTO collections (user_id, title, description, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
        const values = [userId, title, description, isPublic];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Obtener colecciones públicas de un usuario (o todas si es el propio usuario)
    async getUserCollections(requestingUserId, targetUserId) {
        let query = `
      SELECT c.*, 
             COUNT(DISTINCT cg.id) as game_count,
             COUNT(DISTINCT cl.id) as likes_count,
             (SELECT COUNT(*) FROM collection_comments cc WHERE cc.collection_id = c.id) as comments_count
      FROM collections c
      LEFT JOIN collection_games cg ON c.id = cg.collection_id
      LEFT JOIN collection_likes cl ON c.id = cl.collection_id
      WHERE c.user_id = $1
    `;
        const values = [targetUserId];

        if (requestingUserId !== parseInt(targetUserId)) {
            query += ' AND c.is_public = true';
        }

        query += ' GROUP BY c.id ORDER BY c.created_at DESC';

        const result = await pool.query(query, values);
        return result.rows;
    },

    // Obtener detalles de una colección específica
    async getCollectionById(collectionId) {
        const query = `
            SELECT c.*, u.username as creator_username, u.avatar_url as creator_avatar_url, u.avatar_static_url as creator_avatar_static_url
            FROM collections c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = $1
        `;
        const result = await pool.query(query, [collectionId]);
        return result.rows[0];
    },

    // Actualizar una colección
    async updateCollection(collectionId, userId, title, description, isPublic) {
        const query = `
      UPDATE collections
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          is_public = COALESCE($3, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `;
        const values = [title, description, isPublic, collectionId, userId];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Eliminar una colección
    async deleteCollection(collectionId, userId) {
        const query = 'DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(query, [collectionId, userId]);
        return result.rows[0];
    },

    // Manejar juegos en la colección (Para un guardado/actualización masivo)
    async syncCollectionGames(collectionId, gamesList) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Eliminar juegos actuales
            await client.query('DELETE FROM collection_games WHERE collection_id = $1', [collectionId]);

            // 2. Insertar nuevos
            if (gamesList && gamesList.length > 0) {
                const insertQuery = `
          INSERT INTO collection_games (collection_id, igdb_game_id, sort_order)
          VALUES ($1, $2, $3)
        `;
                for (let i = 0; i < gamesList.length; i++) {
                    await client.query(insertQuery, [collectionId, gamesList[i].igdb_game_id, i]);
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    // Obtener juegos de una colección
    async getCollectionGames(collectionId) {
        const query = `
      SELECT igdb_game_id, sort_order, added_at
      FROM collection_games
      WHERE collection_id = $1
      ORDER BY sort_order ASC
    `;
        const result = await pool.query(query, [collectionId]);
        return result.rows;
    },

    // Añadir un juego específico a una colección existente
    async addGameToCollection(collectionId, userId, igdbGameId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Verificar que la colección existe y pertenece al usuario
            const authCheck = await client.query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [collectionId, userId]);
            if (authCheck.rows.length === 0) {
                throw new Error("Colección no encontrada o sin permisos");
            }

            // 2. Verificar que el juego no está ya en la colección
            const duplicateCheck = await client.query('SELECT id FROM collection_games WHERE collection_id = $1 AND igdb_game_id = $2', [collectionId, igdbGameId]);
            if (duplicateCheck.rows.length > 0) {
                // Ya existe, podemos retornar null o lanzar error. En este caso retornamos objeto para identificar duplicado.
                return { isDuplicate: true };
            }

            // 3. Obtener el max sort_order
            const maxOrderResult = await client.query('SELECT MAX(sort_order) as max_order FROM collection_games WHERE collection_id = $1', [collectionId]);
            const nextOrder = (maxOrderResult.rows[0].max_order !== null) ? parseInt(maxOrderResult.rows[0].max_order) + 1 : 0;

            // 4. Insertar
            const insertQuery = `
          INSERT INTO collection_games (collection_id, igdb_game_id, sort_order)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
            const result = await client.query(insertQuery, [collectionId, igdbGameId, nextOrder]);

            // 5. Actualizar updated_at de la colección
            await client.query('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [collectionId]);

            await client.query('COMMIT');
            return { success: true, data: result.rows[0] };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    // Obtener IDs de colecciones del usuario que ya contienen un juego específico
    async getCollectionsContainingGame(userId, igdbGameId) {
        const query = `
            SELECT c.id 
            FROM collections c
            JOIN collection_games cg ON c.id = cg.collection_id
            WHERE c.user_id = $1 AND cg.igdb_game_id = $2
        `;
        const result = await pool.query(query, [userId, igdbGameId]);
        return result.rows.map(row => row.id);
    },

    // --- LIKES ---

    // Get collections liked by a user (by username) — only public collections
    async getLikedCollectionsByUsername(username) {
        const query = `
            SELECT c.*,
                   creator.username  AS creator_username,
                   creator.avatar_url AS creator_avatar_url,
                   creator.avatar_static_url AS creator_avatar_static_url,
                   COUNT(DISTINCT cg.id)  AS game_count,
                   COUNT(DISTINCT cl2.id) AS likes_count,
                   (SELECT COUNT(*) FROM collection_comments cc WHERE cc.collection_id = c.id) AS comments_count
            FROM collection_likes cl
            JOIN users liker         ON cl.user_id         = liker.id
            JOIN collections c       ON cl.collection_id  = c.id
            JOIN users creator       ON c.user_id          = creator.id
            LEFT JOIN collection_games cg  ON c.id = cg.collection_id
            LEFT JOIN collection_likes cl2 ON c.id = cl2.collection_id
            WHERE liker.username = $1
              AND c.is_public    = true
            GROUP BY c.id, creator.username, creator.avatar_url, creator.avatar_static_url, cl.created_at
            ORDER BY cl.created_at DESC
        `;
        const result = await pool.query(query, [username]);
        return result.rows;
    },

    async toggleLike(collectionId, userId) {
        // Verificar si ya existe el like
        const checkQuery = 'SELECT id FROM collection_likes WHERE collection_id = $1 AND user_id = $2';
        const checkResult = await pool.query(checkQuery, [collectionId, userId]);

        if (checkResult.rows.length > 0) {
            // Si existe, lo borramos (Unlike)
            await pool.query('DELETE FROM collection_likes WHERE collection_id = $1 AND user_id = $2', [collectionId, userId]);
            return { liked: false };
        } else {
            // Si no existe, lo creamos (Like)
            await pool.query('INSERT INTO collection_likes (collection_id, user_id) VALUES ($1, $2)', [collectionId, userId]);
            return { liked: true };
        }
    },

    async getLikeCount(collectionId) {
        const query = 'SELECT COUNT(*) FROM collection_likes WHERE collection_id = $1';
        const result = await pool.query(query, [collectionId]);
        return parseInt(result.rows[0].count, 10);
    },

    async hasUserLiked(collectionId, userId) {
        if (!userId) return false;
        const query = 'SELECT id FROM collection_likes WHERE collection_id = $1 AND user_id = $2';
        const result = await pool.query(query, [collectionId, userId]);
        return result.rows.length > 0;
    },

    // --- COMMENTS ---

    async addComment(collectionId, userId, content) {
        const query = `
            INSERT INTO collection_comments (collection_id, user_id, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(query, [collectionId, userId, content]);
        return result.rows[0];
    },

    async getComments(collectionId) {
        const query = `
            SELECT cc.id, cc.content, cc.created_at, u.id as user_id, u.username, u.avatar_url, u.avatar_static_url
            FROM collection_comments cc
            JOIN users u ON cc.user_id = u.id
            WHERE cc.collection_id = $1
            ORDER BY cc.created_at DESC
        `;
        const result = await pool.query(query, [collectionId]);
        return result.rows;
    },

    async deleteComment(commentId, userId) {
        // Asegurarse de que el usuario que borra es el dueño del comentario
        const query = 'DELETE FROM collection_comments WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(query, [commentId, userId]);
        return result.rows[0];
    },

    // --- EXPLORE ---

    async getExploreCollections(sortBy = 'recent', limit = 10) {
        let orderBy = 'c.created_at DESC';
        if (sortBy === 'popular') {
            orderBy = 'likes_count DESC, c.created_at DESC';
        } else if (sortBy === 'interactive') {
            orderBy = 'comments_count DESC, c.created_at DESC';
        }

        const query = `
            SELECT c.*, 
                   u.username as creator_username, 
                   u.avatar_url as creator_avatar_url,
                   u.avatar_static_url as creator_avatar_static_url,
                   COUNT(DISTINCT cg.id) as game_count,
                   (SELECT COUNT(*) FROM collection_likes cl WHERE cl.collection_id = c.id) as likes_count,
                   (SELECT COUNT(*) FROM collection_comments cc WHERE cc.collection_id = c.id) as comments_count
            FROM collections c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN collection_games cg ON c.id = cg.collection_id
            WHERE c.is_public = true
            GROUP BY c.id, u.username, u.avatar_url, u.avatar_static_url
            ORDER BY ${orderBy}
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows;
    }
};

module.exports = Collection;
