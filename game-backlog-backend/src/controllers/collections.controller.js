const Collection = require('../models/collection.model');
const igdbService = require('../services/igdb.service');
const User = require('../models/user.model'); // Asumiendo que existe o usando una query simple. Si no existe User.findByUsername, usaremos pool directamente o lo buscaremos. En este caso enviaremos username por params.

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

        if (username) {
            const user = await User.findByUsername(username);
            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            targetUserId = user.id;
            isProfilePublic = user.is_profile_public;
            targetUsername = user.username;

            if (!isProfilePublic && targetUserId !== requestingUserId) {
                return res.json({
                    collections: [],
                    is_profile_public: false,
                    username: targetUsername
                });
            }
        } else {
            targetUserId = requestingUserId;
        }

        // Obtener colecciones básicas
        const collections = await Collection.getUserCollections(requestingUserId, targetUserId);

        // Para cada colección, obtener hasta 3 carátulas para el collage
        for (let collection of collections) {
            const dbGames = await Collection.getCollectionGames(collection.id);

            // Tomar solo los primeros 3
            const top3Ids = dbGames.slice(0, 3).map(g => g.igdb_game_id);

            if (top3Ids.length > 0) {
                const gamesDetails = await igdbService.getGamesByIds(top3Ids);
                collection.preview_games = top3Ids.map(id => {
                    const det = gamesDetails.find(g => g.id === id);
                    return det ? { id: det.id, cover: det.cover } : null;
                }).filter(g => g !== null);
            } else {
                collection.preview_games = [];
            }
        }

        res.json({
            collections,
            is_profile_public: isProfilePublic,
            username: targetUsername || req.user?.username
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

            collection.games = dbGames.map(cg => {
                const details = gamesDetails.find(g => g.id === cg.igdb_game_id);
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

        // Devolver también la info del usuario para pintar el UI inmediatamente
        res.status(201).json({
            message: 'Comentario añadido',
            comment: {
                ...newComment,
                username: req.user.username || 'User' // Idealmente buscarlo si no está en el token
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
    checkGameInCollections
};
