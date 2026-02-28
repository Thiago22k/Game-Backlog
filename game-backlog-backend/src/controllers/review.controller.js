const Review = require('../models/review.model');
const Game = require('../models/game.model');
const Activity = require('../models/activity.model');
const Notification = require('../models/notification.model');
const igdbService = require('../services/igdb.service');

const reviewController = {
    // 1. Crear o Actualizar una Reseña
    async saveReview(req, res) {
        try {
            const { gameId } = req.params;
            const userId = req.user.userId;
            const { rating, status, subStatus, platform, containsSpoiler, content } = req.body;

            // Validación estricta
            if (!status) {
                return res.status(400).json({ error: 'El estado es obligatorio.' });
            }
            if (!rating || Number(rating) <= 0) {
                return res.status(400).json({ error: 'La calificación es obligatoria.' });
            }
            if (!platform || platform.trim() === '') {
                return res.status(400).json({ error: 'La plataforma es obligatoria.' });
            }
            if (!content || content.trim() === '') {
                return res.status(400).json({ error: 'La reseña es obligatoria.' });
            }
            if (content.length > 4000) {
                return res.status(400).json({ error: 'La reseña no puede exceder los 4000 caracteres.' });
            }

            const validRating = Number(rating);

            // Sync con la tabla user_games
            const gameExistsInList = await Game.gameExists(userId, gameId);
            if (gameExistsInList) {
                await Game.updateGame(userId, gameId, status, validRating);
            } else {
                await Game.addGame(userId, gameId, status, validRating);
            }

            // Obtener info del juego para el log de actividad
            const gameData = await igdbService.getBasicGameById(gameId);
            const commonMetadata = {
                gameId,
                game_name: gameData?.name || 'Unknown Game',
                cover_url: gameData?.cover?.image_id || null,
                rating: validRating,
                status,
                subStatus,
                review_preview: content && content.length > 150 ? content.substring(0, 150) + '...' : content
            };

            // Crear o actualizar la reseña
            const reviewExists = await Review.reviewExists(userId, gameId);
            let review;

            if (reviewExists) {
                review = await Review.updateReview(userId, gameId, validRating, status, subStatus, platform, containsSpoiler, content);
                await Activity.logActivity(userId, 'UPDATE_REVIEW', 'review', review.id, commonMetadata);
            } else {
                review = await Review.createReview(userId, gameId, validRating, status, subStatus, platform, containsSpoiler, content);
                await Activity.logActivity(userId, 'CREATE_REVIEW', 'review', review.id, commonMetadata);
            }

            res.json({ message: 'Review saved successfully', review });
        } catch (error) {
            console.error('Error saving review:', error);
            res.status(500).json({ error: 'Failed to save review' });
        }
    },

    // 2. Obtener la reseña de un usuario para un juego
    async getUserReviewForGame(req, res) {
        try {
            const { gameId } = req.params;
            const userId = req.user.userId;
            const review = await Review.getUserReviewForGame(userId, gameId);

            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            res.json(review);
        } catch (error) {
            console.error('Error fetching user review:', error);
            res.status(500).json({ error: 'Failed to fetch user review' });
        }
    },

    // 3. Obtener reseñas de un juego (paginado)
    async getReviewsByGame(req, res) {
        try {
            const { gameId } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;
            const currentUserId = req.user ? req.user.userId : null; // Si usamos opcional en el router

            const reviews = await Review.getReviewsByGame(gameId, currentUserId, limit, offset);
            res.json(reviews);
        } catch (error) {
            console.error('Error fetching game reviews:', error);
            res.status(500).json({ error: 'Failed to fetch game reviews' });
        }
    },

    // 4. Borrar reseña
    async deleteReview(req, res) {
        try {
            const { gameId } = req.params;
            const userId = req.user.userId;

            const deleted = await Review.deleteReview(userId, gameId);
            if (!deleted) {
                return res.status(404).json({ error: 'Review not found' });
            }

            // Remover actividad para mantener limpieza (opcional)

            res.json({ message: 'Review deleted successfully', review: deleted });
        } catch (error) {
            console.error('Error deleting review:', error);
            res.status(500).json({ error: 'Failed to delete review' });
        }
    },

    // 5. Dar "Me Gusta" o quitar "Me Gusta"
    async toggleLike(req, res) {
        try {
            const { reviewId } = req.params;
            const userId = req.user.userId;

            const result = await Review.toggleLike(reviewId, userId);

            // Si fue un Like, enviar notificación
            if (result.liked) {
                const review = await Review.getReviewById(reviewId);
                if (review && review.user_id !== userId) {
                    const gameData = await igdbService.getBasicGameById(review.igdb_game_id);
                    await Notification.createNotification({
                        recipientId: review.user_id,
                        actorId: userId,
                        type: 'like_review',
                        entityId: String(review.id),
                        metadata: {
                            reviewId: review.id,
                            gameId: review.igdb_game_id,
                            game_name: gameData?.name || 'Unknown Game',
                            game_slug: gameData?.slug || review.igdb_game_id.toString(),
                            actor_username: req.user.username
                        }
                    });
                }
                await Activity.logActivity(userId, 'LIKE_REVIEW', 'review', reviewId);
            }

            res.json(result);
        } catch (error) {
            console.error('Error toggling like:', error);
            res.status(500).json({ error: 'Failed to toggle like' });
        }
    },

    // 6. Agregar comentario
    async addComment(req, res) {
        try {
            const { reviewId } = req.params;
            const userId = req.user.userId;
            const { content } = req.body;

            if (!content || content.trim() === '') {
                return res.status(400).json({ error: 'Content is required' });
            }

            const comment = await Review.addComment(reviewId, userId, content);

            // Notificación al autor de la reseña
            const review = await Review.getReviewById(reviewId);
            if (review && review.user_id !== userId) {
                const gameData = await igdbService.getBasicGameById(review.igdb_game_id);
                await Notification.createNotification({
                    recipientId: review.user_id,
                    actorId: userId,
                    type: 'comment_review',
                    entityId: String(review.id),
                    metadata: {
                        reviewId: review.id,
                        gameId: review.igdb_game_id,
                        commentId: comment.id,
                        game_name: gameData?.name || 'Unknown Game',
                        game_slug: gameData?.slug || review.igdb_game_id.toString(),
                        actor_username: req.user.username
                    }
                });
            }

            await Activity.logActivity(userId, 'COMMENT_REVIEW', 'review_comment', comment.id);
            res.json(comment);
        } catch (error) {
            console.error('Error adding comment:', error);
            res.status(500).json({ error: 'Failed to add comment' });
        }
    },

    // 7. Obtener comentarios de una reseña
    async getComments(req, res) {
        try {
            const { reviewId } = req.params;
            const comments = await Review.getComments(reviewId);
            res.json(comments);
        } catch (error) {
            console.error('Error fetching comments:', error);
            res.status(500).json({ error: 'Failed to fetch comments' });
        }
    },

    // 7.5 Eliminar un comentario
    async deleteComment(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.userId;

            const deleted = await Review.deleteComment(commentId, userId);
            if (!deleted) {
                return res.status(404).json({ error: 'Comment not found or unauthorized' });
            }

            res.json({ message: 'Comment deleted successfully', comment: deleted });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ error: 'Failed to delete comment' });
        }
    },

    // 8. Reportar reseña
    async reportReview(req, res) {
        try {
            const { reviewId } = req.params;
            const userId = req.user.userId;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ error: 'Reason is required' });
            }

            const report = await Review.reportReview(reviewId, userId, reason);
            res.json({ message: 'Review reported successfully', report });
        } catch (error) {
            console.error('Error reporting review:', error);
            // Para atrapar el error de duplicados
            if (error.message.includes('Ya has reportado')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to report review' });
        }
    },

    // 9. Reseñas populares
    async getPopularReviews(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const currentUserId = req.user ? req.user.userId : null;

            const reviews = await Review.getPopularReviews(limit, currentUserId);
            res.json(reviews);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch popular reviews' });
        }
    },

    // 10. Reseñas recientes
    async getRecentReviews(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const currentUserId = req.user ? req.user.userId : null;

            const reviews = await Review.getRecentReviews(limit, currentUserId);
            res.json(reviews);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch recent reviews' });
        }
    },

    // 11. Obtener conteo de reseñas por nombre de usuario
    async getReviewCountByUsername(req, res) {
        try {
            const { username } = req.params;
            const count = await Review.getReviewCountByUsername(username);
            res.json({ count });
        } catch (error) {
            console.error('Error fetching user review count:', error);
            res.status(500).json({ error: 'Failed to fetch review count' });
        }
    }
};

module.exports = reviewController;
