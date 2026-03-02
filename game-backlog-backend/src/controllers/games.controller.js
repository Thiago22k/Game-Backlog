const Game = require('../models/game.model');
const igdbService = require('../services/igdb.service');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const recommendationService = require('../services/recommendation.service');
const { isValidRating } = require('../utils/validation');

// Buscar juegos en IGDB
const searchGames = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'El parámetro "query" es obligatorio'
      });
    }

    const games = await igdbService.searchGames(query);

    res.json({
      results: games.length,
      games
    });

  } catch (error) {
    console.error('Error en searchGames:', error);
    res.status(500).json({
      error: 'Error al buscar juegos'
    });
  }
};

// Obtener detalles de un juego de IGDB
const getGameDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const game = await igdbService.getGameById(id);

    if (!game) {
      return res.status(200).json({
        game: null
      });
    }

    res.json({ game });

  } catch (error) {
    console.error('Error en getGameDetails:', error);
    res.status(500).json({
      error: 'Error al obtener detalles del juego'
    });
  }
};

// Agregar juego a la lista del usuario
const addGameToUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { igdb_game_id, status, rating } = req.body;

    // Validar que venga el ID del juego
    if (!igdb_game_id) {
      return res.status(400).json({
        error: 'El campo igdb_game_id es obligatorio'
      });
    }

    // Validar status si viene
    const validStatuses = ['completed', 'playing', 'wishlist', 'dropped', 'backlog'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    // Validar rating si viene
    if (rating !== undefined && !isValidRating(rating)) {
      return res.status(400).json({
        error: 'Rating debe estar entre 0.5 y 5 en incrementos de 0.5'
      });
    }

    // Verificar si el juego ya existe en la lista del usuario
    const exists = await Game.gameExists(userId, igdb_game_id);
    if (exists) {
      return res.status(409).json({
        error: 'Este juego ya está en tu lista'
      });
    }

    // Agregar juego
    const newGame = await Game.addGame(userId, igdb_game_id, status || 'completed', rating);

    // Registrar actividad en el log (Diferido para no bloquear la respuesta HTTP)
    igdbService.getGameById(igdb_game_id).then(gameDetails => {
      Activity.logActivity(userId, 'ADDED_GAME', 'GAME', igdb_game_id, {
        game_name: gameDetails?.name || 'Unknown Game',
        status: status || 'completed',
        rating: rating || null,
        cover_url: gameDetails?.cover?.image_id ? gameDetails.cover.image_id : null
      }).catch(err => console.error("Error asíncrono en addGameToUser Activity Log:", err));
    }).catch(err => console.error("Error asíncrono obteniendo detalles de IGDB:", err));

    res.status(201).json({
      message: 'Juego agregado exitosamente',
      game: newGame
    });

  } catch (error) {
    console.error('Error en addGameToUser:', error);
    res.status(500).json({
      error: 'Error al agregar juego'
    });
  }
};

// Obtener juegos del usuario
const getUserGames = async (req, res) => {
  try {
    const requestingUserId = req.user?.userId;
    const { username } = req.params; // Viene de /user/:username
    const { status } = req.query;

    let targetUserId;
    let isProfilePublic = true;
    let targetUsername = null;
    let targetAvatarUrl = null;
    let targetBannerUrl = null;
    let targetBio = null;
    let targetSocialTwitch = null;
    let targetSocialDiscord = null;
    let targetSocialSteam = null;

    if (username) {
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      targetUserId = user.id;
      isProfilePublic = user.is_profile_public;
      targetUsername = user.username;
      targetAvatarUrl = user.avatar_url;
      targetBannerUrl = user.banner_url;
      targetBio = user.bio;
      targetSocialTwitch = user.social_twitch;
      targetSocialDiscord = user.social_discord;
      targetSocialSteam = user.social_steam;

      if (!isProfilePublic && targetUserId !== requestingUserId) {
        return res.json({
          games: [],
          total: 0,
          is_profile_public: false,
          user_id: targetUserId,
          username: targetUsername,
          avatar_url: targetAvatarUrl,
          banner_url: targetBannerUrl,
          bio: targetBio,
          social_twitch: targetSocialTwitch,
          social_discord: targetSocialDiscord,
          social_steam: targetSocialSteam,
        });
      }
    } else {
      // Si no hay username, es la ruta /user (protegida por authenticateToken)
      targetUserId = requestingUserId;
      // For the current user, get their profile details if not already set
      if (req.user) {
        targetUsername = req.user.username;
        targetAvatarUrl = req.user.avatar_url;
        targetBannerUrl = req.user.banner_url;
      }
    }

    if (!targetUserId) {
      return res.status(401).json({ error: 'Usuario no identificado' });
    }

    const userGames = await Game.getUserGames(targetUserId, status);

    if (userGames.length === 0) {
      return res.json({
        games: [],
        total: 0,
        is_profile_public: isProfilePublic,
        user_id: targetUserId,
        username: targetUsername || req.user?.username,
        avatar_url: targetAvatarUrl,
        banner_url: targetBannerUrl,
        bio: targetBio,
        social_twitch: targetSocialTwitch,
        social_discord: targetSocialDiscord,
        social_steam: targetSocialSteam,
      });
    }

    const igdbGameIds = [...new Set(userGames.map(g => g.igdb_game_id))];

    const gamesDetails = await igdbService.getGamesByIds(igdbGameIds);

    const gamesWithDetails = userGames.map(userGame => ({
      ...userGame,
      game_details: gamesDetails.find(g => g.id === userGame.igdb_game_id) || null
    }));

    res.json({
      games: gamesWithDetails,
      total: gamesWithDetails.length,
      is_profile_public: isProfilePublic,
      user_id: targetUserId,
      username: targetUsername || req.user?.username,
      avatar_url: targetAvatarUrl,
      banner_url: targetBannerUrl,
      bio: targetBio,
      social_twitch: targetSocialTwitch,
      social_discord: targetSocialDiscord,
      social_steam: targetSocialSteam,
    });

  } catch (error) {
    console.error('Error en getUserGames:', error);
    res.status(500).json({ error: 'Error al obtener tus juegos' });
  }
};

// Actualizar juego del usuario
const updateUserGame = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { igdb_game_id } = req.params;
    const { status, rating } = req.body;

    // Verificar que el juego existe en la lista del usuario
    const game = await Game.getUserGame(userId, igdb_game_id);
    if (!game) {
      return res.status(404).json({
        error: 'Juego no encontrado en tu lista'
      });
    }

    // Validar status si viene
    const validStatuses = ['completed', 'playing', 'wishlist', 'dropped', 'backlog'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    // Validar rating si viene
    if (rating !== undefined && rating !== null && !isValidRating(rating)) {
      return res.status(400).json({
        error: 'Rating debe estar entre 0.5 y 5 en incrementos de 0.5'
      });
    }

    // Actualizar
    const updatedGame = await Game.updateGame(userId, igdb_game_id, status, rating);

    // Registrar actividad en el log (Diferido asíncrono)
    if ((status && status !== game.status) || (rating && rating !== game.rating)) {
      igdbService.getGameById(igdb_game_id).then(gameDetails => {
        const metadata = {
          game_name: gameDetails?.name || 'Unknown Game',
          cover_url: gameDetails?.cover?.image_id ? gameDetails.cover.image_id : null
        };

        if (status && status !== game.status) {
          metadata.new_status = status;
          Activity.logActivity(userId, 'STATUS_CHANGED', 'GAME', igdb_game_id, metadata)
            .catch(err => console.error("Activity Log Error:", err));
        } else if (rating && rating !== game.rating) {
          metadata.new_rating = rating;
          Activity.logActivity(userId, 'RATED_GAME', 'GAME', igdb_game_id, metadata)
            .catch(err => console.error("Activity Log Error:", err));
        }
      }).catch(err => console.error("Error IGDB background fetching:", err));
    }

    res.json({
      message: 'Juego actualizado exitosamente',
      game: updatedGame
    });

  } catch (error) {
    console.error('Error en updateUserGame:', error);
    res.status(500).json({
      error: 'Error al actualizar juego'
    });
  }
};

// Eliminar juego del usuario
const deleteUserGame = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { igdb_game_id } = req.params;

    // Verificar que el juego existe
    const game = await Game.getUserGame(userId, igdb_game_id);
    if (!game) {
      return res.status(404).json({
        error: 'Juego no encontrado en tu lista'
      });
    }

    // Eliminar
    await Game.deleteGame(userId, igdb_game_id);

    res.json({
      message: 'Juego eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en deleteUserGame:', error);
    res.status(500).json({
      error: 'Error al eliminar juego'
    });
  }
};

// Obtener juegos populares
const getPopularGames = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const games = await igdbService.getPopularGames(limit);

    res.json({
      total: games.length,
      games
    });

  } catch (error) {
    console.error('Error en getPopularGames:', error);
    res.status(500).json({
      error: 'Error al obtener juegos populares'
    });
  }
};

// Obtener juegos recientes
const getRecentGames = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const games = await igdbService.getRecentGames(limit);

    res.json({
      total: games.length,
      games
    });

  } catch (error) {
    console.error('Error en getRecentGames:', error);
    res.status(500).json({
      error: 'Error al obtener juegos recientes'
    });
  }
};

// Obtener juegos más esperados
const getMostAnticipated = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const games = await igdbService.getMostAnticipated(limit);

    res.json({
      total: games.length,
      games
    });

  } catch (error) {
    console.error('Error en getMostAnticipated:', error);
    res.status(500).json({
      error: 'Error al obtener juegos más esperados'
    });
  }
};

// Explorar juegos con filtros
const exploreGames = async (req, res) => {
  try {
    const filters = {
      sort: req.query.sort || 'relevance',
      timeRange: req.query.timeRange || null, // ← Cambio aquí
      genres: req.query.genres ? req.query.genres.split(',').map(Number) : [],
      platforms: req.query.platforms ? req.query.platforms.split(',').map(Number) : [],
      gameTypes: req.query.gameTypes ? req.query.gameTypes.split(',').map(Number) : [],
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
    };

    const games = await igdbService.exploreGames(filters);

    res.json({
      total: games.length,
      games,
      filters
    });

  } catch (error) {
    console.error('Error en exploreGames:', error);
    res.status(500).json({
      error: 'Error al explorar juegos'
    });
  }
};

// Obtener géneros
const getGenres = async (req, res) => {
  try {
    const genres = await igdbService.getGenres();
    res.json({ genres });
  } catch (error) {
    console.error('Error en getGenres:', error);
    res.status(500).json({
      error: 'Error al obtener géneros'
    });
  }
};

// Obtener plataformas
const getPlatforms = async (req, res) => {
  try {
    const platforms = await igdbService.getPlatforms();
    res.json({ platforms });
  } catch (error) {
    console.error('Error en getPlatforms:', error);
    res.status(500).json({
      error: 'Error al obtener plataformas'
    });
  }
};

// Obtener estadísticas comunitarias de un juego
const getGameStats = async (req, res) => {
  try {
    const { igdb_game_id } = req.params;
    const stats = await Game.getGameStats(igdb_game_id);
    res.json({ stats });
  } catch (error) {
    console.error('Error en getGameStats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del juego' });
  }
};

// Obtener recomendaciones personalizadas
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const games = await recommendationService.getRecommendations(userId, limit);

    res.json({
      total: games.length,
      games
    });
  } catch (error) {
    console.error('Error en getRecommendations:', error);
    res.status(500).json({ error: 'Error al obtener recomendaciones' });
  }
};

module.exports = {
  searchGames,
  getGameDetails,
  addGameToUser,
  getUserGames,
  updateUserGame,
  deleteUserGame,
  getPopularGames,
  getRecentGames,
  getMostAnticipated,
  exploreGames,
  getGenres,
  getPlatforms,
  getGameStats,
  getRecommendations, // ← Nuevo
};