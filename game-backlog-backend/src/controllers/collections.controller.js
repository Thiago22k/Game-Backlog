const Collection = require('../models/collection.model');
const igdbService = require('../services/igdb.service');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const Notification = require('../models/notification.model');

// En lugar del workaround, usaremos User.findByUsername

// Crear una colección
const createCollection = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, description, is_public, games } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'El título es obligatorio' });
        }

        // 1. Crear colección
        const collection = await Collection.createCollection(userId, title, description, is_public !== undefined ? is_public : true);

        // 2. Asociar juegos
        if (games && Array.isArray(games) && games.length > 0) {
            await Collection.syncCollectionGames(collection.id, games);
        }

        // Registrar actividad
        await Activity.logActivity(userId, 'CREATED_COLLECTION', 'COLLECTION', collection.id, {
            collection_name: title,
            is_public: is_public !== undefined ? is_public : true
        });

        res.status(201).json({
            message: 'Colección creada exitosamente',
            collection
        });
    } catch (error) {
        console.error('Error en createCollection:', error);
        res.status(500).json({ error: 'Error al crear la colección' });
    }
};

// Obtener colecciones de un usuario
const getUserCollections = async (req, res) => {
    try {
        const requestingUserId = req.user?.userId; // Si está autenticado
        const { username } = req.params;

        let targetUserId;
        let isProfilePublic = true;
        let targetUsername = null;
        let targetUser = null;

        if (username) {
            targetUser = await User.findByUsername(username);
            if (!targetUser) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            targetUserId = targetUser.id;
            isProfilePublic = targetUser.is_profile_public;
            targetUsername = targetUser.username;

            if (!isProfilePublic && targetUserId !== requestingUserId) {
                return res.json({
                    collections: [],
                    is_profile_public: false,
                    username: targetUsername,
                    avatar_url: targetUser.avatar_url,
                    avatar_static_url: targetUser.avatar_static_url,
                    banner_url: targetUser.banner_url
                });
            }
        } else {
            targetUserId = requestingUserId;
        }

        // Obtener colecciones básicas
        const collections = await Collection.getUserCollections(requestingUserId, targetUserId);

        // Para cada colección, obtener hasta 3 carátulas para el collage
        const collectionsGamesMap = {};
        const allTopGameIdsSet = new Set();

        const collectionIds = collections.map(c => c.id);
        const allDbGames = await Collection.getGamesForMultipleCollections(collectionIds);
        const gamesByCollection = {};
        allDbGames.forEach(g => {
            if (!gamesByCollection[g.collection_id]) gamesByCollection[g.collection_id] = [];
            gamesByCollection[g.collection_id].push(g);
        });

        for (let collection of collections) {
            const dbGames = gamesByCollection[collection.id] || [];
            const top3Ids = dbGames.slice(0, 3).map(g => g.igdb_game_id);
            collectionsGamesMap[collection.id] = top3Ids;
            top3Ids.forEach(id => allTopGameIdsSet.add(id));
        }

        const allTopGameIds = Array.from(allTopGameIdsSet);

        if (allTopGameIds.length > 0) {
            const gamesDetails = await igdbService.getGamesByIds(allTopGameIds);
            const gamesMap = new Map(gamesDetails.map(g => [g.id, g]));

            for (let collection of collections) {
                const top3Ids = collectionsGamesMap[collection.id];
                collection.preview_games = top3Ids.map(id => {
                    const det = gamesMap.get(id);
                    return det ? { id: det.id, cover: det.cover } : null;
                }).filter(g => g !== null);
            }
        } else {
            for (let collection of collections) {
                collection.preview_games = [];
            }
        }

        res.json({
            collections,
            is_profile_public: isProfilePublic,
            username: targetUsername || req.user?.username,
            avatar_url: targetUser ? targetUser.avatar_url : undefined,
            avatar_static_url: targetUser ? targetUser.avatar_static_url : undefined,
            banner_url: targetUser ? targetUser.banner_url : undefined
        });
    } catch (error) {
        console.error('Error en getUserCollections:', error);
        res.status(500).json({ error: 'Error al obtener colecciones' });
    }
};

// Obtener detalles de una colección con todos sus juegos
const getCollectionDetails = async (req, res) => {
    try {
        const requestingUserId = req.user?.userId;
        const { id } = req.params;

        const collection = await Collection.getCollectionById(id);

        if (!collection) {
            return res.status(404).json({ error: 'Colección no encontrada' });
        }

        if (!collection.is_public && collection.user_id !== requestingUserId) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta colección' });
        }

        const dbGames = await Collection.getCollectionGames(id);

        if (dbGames.length > 0) {
            const igdbGameIds = dbGames.map(g => g.igdb_game_id);
            const gamesDetails = await igdbService.getGamesByIds(igdbGameIds);
            const gamesMap = new Map(gamesDetails.map(g => [g.id, g]));

            collection.games = dbGames.map(cg => {
                const details = gamesMap.get(cg.igdb_game_id);
                return {
                    ...cg,
                    game_details: details || null
                };
            });
        } else {
            collection.games = [];
        }

        // Obtener datos sociales
        collection.likes_count = await Collection.getLikeCount(id);

        if (requestingUserId) {
            collection.user_has_liked = await Collection.hasUserLiked(id, requestingUserId);
        } else {
            collection.user_has_liked = false;
        }

        res.json({ collection });
    } catch (error) {
        console.error('Error en getCollectionDetails:', error);
        res.status(500).json({ error: 'Error al obtener los detalles de la colección' });
    }
};

// Actualizar colección
const updateCollection = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { title, description, is_public, games } = req.body;

        const collection = await Collection.updateCollection(id, userId, title, description, is_public);

        if (!collection) {
            return res.status(404).json({ error: 'Colección no encontrada o no tienes permisos' });
        }

        if (games && Array.isArray(games)) {
            await Collection.syncCollectionGames(id, games);
        }

        res.json({
            message: 'Colección actualizada exitosamente',
            collection
        });
    } catch (error) {
        console.error('Error en updateCollection:', error);
        res.status(500).json({ error: 'Error al actualizar la colección' });
    }
};

// Eliminar colección
const deleteCollection = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const deleted = await Collection.deleteCollection(id, userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Colección no encontrada o no tienes permisos' });
        }

        res.json({ message: 'Colección eliminada exitosamente' });
    } catch (error) {
        console.error('Error en deleteCollection:', error);
        res.status(500).json({ error: 'Error al eliminar la colección' });
    }
};

// --- LIKES ---

const toggleLike = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params; // collection_id

        const result = await Collection.toggleLike(id, userId);
        const newCount = await Collection.getLikeCount(id);

        // Fetch collection details for metadata naming
        const collection = await Collection.getCollectionById(id);

        // Log Activity only if it was a "Like" (not unlike)
        if (result.liked && collection) {
            await Activity.logActivity(
                userId,
                'LIKED_COLLECTION',
                'collection',
                id,
                { collection_name: collection.title }
            );
            // Create notification for the collection owner
            await Notification.createNotification({
                recipientId: collection.user_id,
                actorId: userId,
                type: 'LIKED_COLLECTION',
                entityId: String(id),
                metadata: {
                    collection_name: collection.title,
                    actor_username: req.user.username,
                }
            });
        }

        res.json({
            liked: result.liked,
            likes_count: newCount
        });
    } catch (error) {
        console.error('Error en toggleLike:', error);
        res.status(500).json({ error: 'Error al procesar el like' });
    }
};

// --- COMENTARIOS ---

const getComments = async (req, res) => {
    try {
        const { id } = req.params; // collection_id
        const comments = await Collection.getComments(id);
        res.json({ comments });
    } catch (error) {
        console.error('Error en getComments:', error);
        res.status(500).json({ error: 'Error al obtener comentarios' });
    }
};

const addComment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params; // collection_id
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'El contenido del comentario es requerido' });
        }

        const newComment = await Collection.addComment(id, userId, content.trim());

        // Obtener avatar_url del usuario en DB para inyectarlo en la respuesta
        const user = await User.findById(userId);

        // Fetch collection details for metadata naming
        const collection = await Collection.getCollectionById(id);

        // Log Activity for comment
        if (collection) {
            await Activity.logActivity(
                userId,
                'COMMENTED_COLLECTION',
                'collection',
                id,
                {
                    collection_name: collection.title,
                    comment_preview: content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '')
                }
            );
            // Create notification for the collection owner
            await Notification.createNotification({
                recipientId: collection.user_id,
                actorId: userId,
                type: 'COMMENTED_COLLECTION',
                entityId: String(id),
                metadata: {
                    collection_name: collection.title,
                    actor_username: req.user.username,
                    comment_preview: content.trim().substring(0, 60) + (content.trim().length > 60 ? '...' : ''),
                }
            });
        }

        // Devolver también la info del usuario para pintar el UI inmediatamente
        res.status(201).json({
            message: 'Comentario añadido',
            comment: {
                ...newComment,
                username: req.user.username || user?.username || 'User',
                avatar_url: user?.avatar_url || null,
                avatar_static_url: user?.avatar_static_url || null
            }
        });
    } catch (error) {
        console.error('Error en addComment:', error);
        res.status(500).json({ error: 'Error al añadir comentario' });
    }
};

const deleteComment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, commentId } = req.params; // collection_id y comment_id

        const deleted = await Collection.deleteComment(commentId, userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Comentario no encontrado o no tienes permiso para eliminarlo' });
        }

        res.json({ message: 'Comentario eliminado exitosamente' });
    } catch (error) {
        console.error('Error en deleteComment:', error);
        res.status(500).json({ error: 'Error al eliminar comentario' });
    }
};

// --- SINGLE GAME ADDITION ---

const addGameToCollection = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params; // collection_id
        const { igdb_game_id } = req.body;

        if (!igdb_game_id) {
            return res.status(400).json({ error: 'El ID del juego (igdb_game_id) es requerido' });
        }

        const result = await Collection.addGameToCollection(id, userId, igdb_game_id);

        if (result.isDuplicate) {
            return res.status(409).json({ error: 'El juego ya está en esta colección' });
        }

        res.status(201).json({
            message: 'Juego añadido a la colección',
            game: result.data
        });
    } catch (error) {
        if (error.message.includes('No encontrada o sin permisos')) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Error en addGameToCollection:', error);
        res.status(500).json({ error: 'Error al añadir el juego a la colección' });
    }
};

const checkGameInCollections = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { igdb_game_id } = req.params;

        const collectionIds = await Collection.getCollectionsContainingGame(userId, igdb_game_id);

        res.json({ collectionIds });
    } catch (error) {
        console.error('Error en checkGameInCollections:', error);
        res.status(500).json({ error: 'Error al verificar colecciones' });
    }
};

const getExploreCollections = async (req, res) => {
    try {
        const limit = 8;

        // Fetch categories
        const recent = await Collection.getExploreCollections('recent', limit);
        const popular = await Collection.getExploreCollections('popular', limit);
        const interactive = await Collection.getExploreCollections('interactive', limit);

        const allCollections = [...recent, ...popular, ...interactive];
        const uniqueIds = [...new Set(allCollections.map(c => c.id))];

        // Recopilar todos los juegos de todas las colecciones únicas primero
        const collectionsGamesMap = {};
        const allTopGameIdsSet = new Set();

        const allDbGames = await Collection.getGamesForMultipleCollections(uniqueIds);
        const gamesByCollection = {};
        allDbGames.forEach(g => {
            if (!gamesByCollection[g.collection_id]) gamesByCollection[g.collection_id] = [];
            gamesByCollection[g.collection_id].push(g);
        });

        for (const collId of uniqueIds) {
            const dbGames = gamesByCollection[collId] || [];
            const top3Ids = dbGames.slice(0, 3).map(g => g.igdb_game_id);
            collectionsGamesMap[collId] = top3Ids;
            top3Ids.forEach(id => allTopGameIdsSet.add(id));
        }

        const allTopGameIds = Array.from(allTopGameIdsSet);
        const collectionPreviews = {};

        // Hacer UNA sola petición a IGDB con todos los IDs requeridos
        if (allTopGameIds.length > 0) {
            const gamesDetails = await igdbService.getGamesByIds(allTopGameIds);
            const gamesMap = new Map(gamesDetails.map(g => [g.id, g]));

            for (const collId of uniqueIds) {
                const top3Ids = collectionsGamesMap[collId];
                collectionPreviews[collId] = top3Ids.map(id => {
                    const det = gamesMap.get(id);
                    return det ? { id: det.id, cover: det.cover } : null;
                }).filter(g => g !== null);
            }
        } else {
            for (const collId of uniqueIds) {
                collectionPreviews[collId] = [];
            }
        }

        // Attach previews to results
        const attachPreviews = (colls) => colls.map(c => ({
            ...c,
            preview_games: collectionPreviews[c.id] || []
        }));

        res.json({
            recent: attachPreviews(recent),
            popular: attachPreviews(popular),
            interactive: attachPreviews(interactive)
        });

    } catch (error) {
        console.error('Error en getExploreCollections:', error);
        res.status(500).json({ error: 'Error al obtener colecciones explorables' });
    }
};

// GET /collections/liked/user/:username — Get collections liked by a user
const getUserLikedCollections = async (req, res) => {
    try {
        const { username } = req.params;

        const collections = await Collection.getLikedCollectionsByUsername(username);

        if (collections.length === 0) {
            return res.json({ collections: [] });
        }

        // Build preview_games for each collection (same pattern as getUserCollections)
        const collectionsGamesMap = {};
        const allTopGameIdsSet = new Set();

        const collectionIds = collections.map(c => c.id);
        const allDbGames = await Collection.getGamesForMultipleCollections(collectionIds);
        const gamesByCollection = {};
        allDbGames.forEach(g => {
            if (!gamesByCollection[g.collection_id]) gamesByCollection[g.collection_id] = [];
            gamesByCollection[g.collection_id].push(g);
        });

        for (const collection of collections) {
            const dbGames = gamesByCollection[collection.id] || [];
            const top3Ids = dbGames.slice(0, 3).map(g => g.igdb_game_id);
            collectionsGamesMap[collection.id] = top3Ids;
            top3Ids.forEach(id => allTopGameIdsSet.add(id));
        }

        const allTopGameIds = Array.from(allTopGameIdsSet);

        if (allTopGameIds.length > 0) {
            const gamesDetails = await igdbService.getGamesByIds(allTopGameIds);
            const gamesMap = new Map(gamesDetails.map(g => [g.id, g]));

            for (const collection of collections) {
                const top3Ids = collectionsGamesMap[collection.id];
                collection.preview_games = top3Ids.map(id => {
                    const det = gamesMap.get(id);
                    return det ? { id: det.id, cover: det.cover } : null;
                }).filter(g => g !== null);
            }
        } else {
            for (const collection of collections) {
                collection.preview_games = [];
            }
        }

        res.json({ collections });
    } catch (error) {
        console.error('Error en getUserLikedCollections:', error);
        res.status(500).json({ error: 'Error al obtener colecciones likeadas' });
    }
};

const reportCollection = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { reason, details } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'La razón del reporte es obligatoria' });
        }

        const report = await Collection.reportCollection(id, userId, reason, details);
        res.status(201).json({ message: 'Colección reportada exitosamente', report });
    } catch (error) {
        console.error('Error en reportCollection:', error);
        if (error.message.includes('Ya has reportado') || error.code === '23505') {
            return res.status(400).json({ error: 'Ya has reportado esta colección previamente.' });
        }
        res.status(500).json({ error: 'Error al reportar la colección' });
    }
};

const reportCommentAction = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { commentId } = req.params;
        const { reason, details } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'La razón del reporte es obligatoria' });
        }

        const report = await Collection.reportComment(commentId, userId, reason, details);
        res.status(201).json({ message: 'Comentario reportado exitosamente', report });
    } catch (error) {
        console.error('Error en reportCommentAction:', error);
        if (error.message.includes('Ya has reportado') || error.code === '23505') {
            return res.status(400).json({ error: 'Ya has reportado este comentario previamente.' });
        }
        res.status(500).json({ error: 'Error al reportar el comentario' });
    }
};

module.exports = {
    createCollection,
    getUserCollections,
    getCollectionDetails,
    updateCollection,
    deleteCollection,
    toggleLike,
    getComments,
    addComment,
    deleteComment,
    addGameToCollection,
    checkGameInCollections,
    getExploreCollections,
    getUserLikedCollections,
    reportCollection,
    reportCommentAction
};
