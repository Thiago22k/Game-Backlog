const express = require('express');
const router = express.Router();
const collectionsController = require('../controllers/collections.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth'); // Middleware para requerir auth

// Middleware opcional (si existe en tu app) para extraer el usuario del token sin bloquear la petición si no hay token.
// Si no tienes uno, podemos saltarlo y depender de la validación en el controlador, pero usaremos authenticateToken donde sea obligatorio.

router.get('/explore', optionalAuth, collectionsController.getExploreCollections);
router.get('/user/:username', optionalAuth, collectionsController.getUserCollections); // Opcionalmente publico
router.get('/liked/user/:username', optionalAuth, collectionsController.getUserLikedCollections); // Liked collections by username
router.get('/:id', optionalAuth, collectionsController.getCollectionDetails);       // Opcionalmente publico
router.get('/:id/comments', optionalAuth, collectionsController.getComments);

// Rutas protegidas
router.use(authenticateToken);
router.post('/', collectionsController.createCollection);
router.put('/:id', collectionsController.updateCollection);
router.delete('/:id', collectionsController.deleteCollection);

// --- SINGLE GAME ---
router.post('/:id/games', collectionsController.addGameToCollection);
router.get('/contains/:igdb_game_id', collectionsController.checkGameInCollections);

// --- SOCIAL ---
router.post('/:id/like', collectionsController.toggleLike);
router.post('/:id/comments', collectionsController.addComment);
router.delete('/:id/comments/:commentId', collectionsController.deleteComment);

// Opcionalmente público, al final lo extraemos del auth obligatorio

module.exports = router;
