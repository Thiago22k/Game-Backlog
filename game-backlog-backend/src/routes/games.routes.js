const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/games.controller');
const authenticateToken = require('../middlewares/auth');

// Rutas públicas (búsqueda de juegos en IGDB)
router.get('/search', gamesController.searchGames);
router.get('/igdb/:id', gamesController.getGameDetails);
router.get('/popular', gamesController.getPopularGames);
router.get('/recent', gamesController.getRecentGames);
router.get('/anticipated', gamesController.getMostAnticipated);
router.get('/explore', gamesController.exploreGames);     // ← Nuevo
router.get('/genres', gamesController.getGenres);         // ← Nuevo
router.get('/platforms', gamesController.getPlatforms);   // ← Nuevo

// Rutas protegidas (requieren autenticación)
router.post('/user', authenticateToken, gamesController.addGameToUser);
router.get('/user', authenticateToken, gamesController.getUserGames);
router.put('/user/:igdb_game_id', authenticateToken, gamesController.updateUserGame);
router.delete('/user/:igdb_game_id', authenticateToken, gamesController.deleteUserGame);

module.exports = router;