const GameLikes = require('../models/game_likes.model');
const Activity = require('../models/activity.model');

// POST /api/games/likes/:igdb_game_id — Toggle like
const toggleGameLike = async (req, res) => {
    try {
        const userId = req.user.userId;
        const igdbGameId = parseInt(req.params.igdb_game_id);
        const { game_name, cover_url } = req.body; // passed from frontend for metadata

        const result = await GameLikes.toggleLike(igdbGameId, userId);
        const newCount = await GameLikes.getLikeCount(igdbGameId);

        // Log to activity feed only on a new like (not unlike)
        if (result.liked) {
            await Activity.logActivity(
                userId,
                'LIKED_GAME',
                'game',
                String(igdbGameId),
                { game_name: game_name || 'Unknown Game', cover_url: cover_url || null }
            );
        }

        res.json({
            liked: result.liked,
            likes_count: newCount
        });
    } catch (error) {
        console.error('Error en toggleGameLike:', error);
        res.status(500).json({ error: 'Error al procesar el like' });
    }
};

// GET /api/games/likes/:igdb_game_id — Get like count + user like status
const getGameLikeStatus = async (req, res) => {
    try {
        const igdbGameId = parseInt(req.params.igdb_game_id);
        const userId = req.user?.userId; // optional auth

        const [likes_count, user_has_liked] = await Promise.all([
            GameLikes.getLikeCount(igdbGameId),
            GameLikes.hasUserLiked(igdbGameId, userId)
        ]);

        res.json({ likes_count, user_has_liked });
    } catch (error) {
        console.error('Error en getGameLikeStatus:', error);
        res.status(500).json({ error: 'Error al obtener likes del juego' });
    }
};

// GET /api/games/likes/user/:userId — Get all liked games for a user
const getUserLikedGames = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const games = await GameLikes.getLikedGamesByUser(userId);
        res.json({ games });
    } catch (error) {
        console.error('Error en getUserLikedGames:', error);
        res.status(500).json({ error: 'Error al obtener juegos favoritos' });
    }
};

// GET /api/games/likes/by-username/:username — Get all liked games for a user by username
const getUserLikedGamesByUsername = async (req, res) => {
    try {
        const igdbService = require('../services/igdb.service');
        const { username } = req.params;
        const likedRows = await GameLikes.getLikedGamesByUsername(username);

        if (likedRows.length === 0) {
            return res.json({ games: [] });
        }

        const igdbIds = likedRows.map(r => r.igdb_game_id);
        const gamesDetails = await igdbService.getGamesByIds(igdbIds);

        // Preserve the like order and merge details
        const games = likedRows.map(row => ({
            igdb_game_id: row.igdb_game_id,
            liked_at: row.created_at,
            game_details: gamesDetails.find(g => g.id === row.igdb_game_id) || null
        })).filter(g => g.game_details !== null);

        res.json({ games });
    } catch (error) {
        console.error('Error en getUserLikedGamesByUsername:', error);
        res.status(500).json({ error: 'Error al obtener juegos favoritos' });
    }
};

module.exports = { toggleGameLike, getGameLikeStatus, getUserLikedGames, getUserLikedGamesByUsername };
