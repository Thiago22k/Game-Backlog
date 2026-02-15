const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/games.controller');
const authenticateToken = require('../middlewares/auth');

// Rutas públicas (búsqueda de juegos en IGDB)
router.get('/search', gamesController.searchGames);
router.get('/igdb/:id', gamesController.getGameDetails);

// Rutas protegidas (requieren autenticación)
router.post('/user', authenticateToken, gamesController.addGameToUser);
router.get('/user', authenticateToken, gamesController.getUserGames);
router.put('/user/:igdb_game_id', authenticateToken, gamesController.updateUserGame);
router.delete('/user/:igdb_game_id', authenticateToken, gamesController.deleteUserGame);

module.exports = router;