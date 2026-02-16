const Game = require('../models/game.model');
const igdbService = require('../services/igdb.service');

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
      return res.status(404).json({
        error: 'Juego no encontrado'
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
    const validStatuses = ['completed', 'playing', 'wishlist', 'dropped'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    // Validar rating si viene
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating debe estar entre 1 y 5'
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
    const userId = req.user.userId;
    const { status } = req.query;

    const games = await Game.getUserGames(userId, status);

    // Obtener detalles de IGDB para cada juego
    const gamesWithDetails = await Promise.all(
      games.map(async (game) => {
        try {
          const igdbGame = await igdbService.getGameById(game.igdb_game_id);
          return {
            ...game,
            game_details: igdbGame
          };
        } catch (error) {
          // Si falla obtener de IGDB, devolver sin detalles
          return {
            ...game,
            game_details: null
          };
        }
      })
    );

    res.json({
      total: gamesWithDetails.length,
      games: gamesWithDetails
    });

  } catch (error) {
    console.error('Error en getUserGames:', error);
    res.status(500).json({
      error: 'Error al obtener juegos del usuario'
    });
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
    const validStatuses = ['completed', 'playing', 'wishlist', 'dropped'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    // Validar rating si viene
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating debe estar entre 1 y 5'
      });
    }

    // Actualizar
    const updatedGame = await Game.updateGame(userId, igdb_game_id, status, rating);

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
  exploreGames,   // ← Nuevo
  getGenres,      // ← Nuevo
  getPlatforms,   // ← Nuevo
};