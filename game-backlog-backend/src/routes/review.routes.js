const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');

// ----- RUTAS PÚBLICAS (Opcionalmente autenticadas) -----
// Obtener reseñas populares
router.get('/popular', optionalAuth, reviewController.getPopularReviews);

// Obtener reseñas recientes
router.get('/recent', optionalAuth, reviewController.getRecentReviews);

// Obtener reseñas de un juego específico
router.get('/game/:gameId', optionalAuth, reviewController.getReviewsByGame);

// Obtener los comentarios de una reseña
router.get('/:reviewId/comments', reviewController.getComments);

// Obtener conteo de reseñas por nombre de usuario
router.get('/user/:username/count', reviewController.getReviewCountByUsername);


// ----- RUTAS PROTEGIDAS -----

// Obtener la reseña propia de un juego
router.get('/game/:gameId/me', authenticateToken, reviewController.getUserReviewForGame);

// Crear / Actualizar una reseña
router.post('/game/:gameId', authenticateToken, reviewController.saveReview);

// Borrar reseña
router.delete('/game/:gameId', authenticateToken, reviewController.deleteReview);

// Toggle Like
router.post('/:reviewId/like', authenticateToken, reviewController.toggleLike);

// Agregar comentario
router.post('/:reviewId/comments', authenticateToken, reviewController.addComment);

// Borrar comentario
router.delete('/:reviewId/comments/:commentId', authenticateToken, reviewController.deleteComment);

// Reportar reseña
router.post('/:reviewId/report', authenticateToken, reviewController.reportReview);

module.exports = router;
