const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/games.controller');
const likesController = require('../controllers/likes.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { memoryCache } = require('../middlewares/memoryCache');

// Rutas públicas (búsqueda de juegos en IGDB)
router.get('/search', gamesController.searchGames);
router.get('/igdb/:id', gamesController.getGameDetails);
router.get('/popular', memoryCache(300), gamesController.getPopularGames);
router.get('/recent', memoryCache(300), gamesController.getRecentGames);
router.get('/anticipated', memoryCache(300), gamesController.getMostAnticipated);
router.get('/genres', memoryCache(3600), gamesController.getGenres);
router.get('/platforms', memoryCache(3600), gamesController.getPlatforms);
router.get('/explore', memoryCache(180), gamesController.exploreGames);
router.get('/recommendations', optionalAuth, gamesController.getRecommendations);
router.get('/user/:username', optionalAuth, gamesController.getUserGames);

router.get('/stats/:igdb_game_id', gamesController.getGameStats);
router.get('/stats/:igdb_game_id/:stat/users', gamesController.getGameStatUsers);

// Likes routes —— /api/games/likes/...
router.get('/likes/user/:userId', optionalAuth, likesController.getUserLikedGames);
router.get('/likes/by-username/:username', optionalAuth, likesController.getUserLikedGamesByUsername);
router.get('/likes/bulk', optionalAuth, likesController.getBulkGameLikeStatus);
router.get('/likes/:igdb_game_id', optionalAuth, likesController.getGameLikeStatus);
router.post('/likes/:igdb_game_id', authenticateToken, likesController.toggleGameLike);

// Rutas protegidas (requieren autenticación)
router.post('/user', authenticateToken, gamesController.addGameToUser);
router.get('/user', authenticateToken, gamesController.getUserGames);
router.put('/user/:igdb_game_id', authenticateToken, gamesController.updateUserGame);
router.delete('/user/:igdb_game_id', authenticateToken, gamesController.deleteUserGame);
router.post('/user/:igdb_game_id/session', authenticateToken, gamesController.logGameSession);

module.exports = router;
