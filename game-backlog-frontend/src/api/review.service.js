import axios from './axios';
import { ENDPOINTS } from '../utils/constants';

const reviewService = {
    // Guardar (Crear/Actualizar) reseña
    saveReview: async (gameId, reviewData) => {
        const response = await axios.post(ENDPOINTS.REVIEWS.SAVE(gameId), reviewData);
        return response.data;
    },

    // Obtener la reseña del usuario logueado para un juego específico
    getMyReview: async (gameId) => {
        try {
            const response = await axios.get(ENDPOINTS.REVIEWS.MY_REVIEW(gameId));
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return null; // Return null if review doesn't exist
            }
            throw error;
        }
    },

    // Obtener todas las reseñas de un juego
    getGameReviews: async (gameId, params = { limit: 10, offset: 0 }) => {
        const response = await axios.get(ENDPOINTS.REVIEWS.BY_GAME(gameId), { params });
        return response.data;
    },

    // Obtener reseñas populares
    getPopular: async (params = { limit: 10 }) => {
        const response = await axios.get(ENDPOINTS.REVIEWS.POPULAR, { params });
        return response.data;
    },

    // Obtener reseñas recientes
    getRecent: async (params = { limit: 10 }) => {
        const response = await axios.get(ENDPOINTS.REVIEWS.RECENT, { params });
        return response.data;
    },

    // Borrar reseña
    deleteReview: async (gameId) => {
        const response = await axios.delete(ENDPOINTS.REVIEWS.DELETE(gameId));
        return response.data;
    },

    // Toggle "Me Gusta"
    toggleLike: async (reviewId) => {
        const response = await axios.post(ENDPOINTS.REVIEWS.TOGGLE_LIKE(reviewId));
        return response.data;
    },

    // Agregar comentario
    addComment: async (reviewId, content) => {
        const response = await axios.post(ENDPOINTS.REVIEWS.ADD_COMMENT(reviewId), { content });
        return response.data;
    },

    // Obtener comentarios
    getComments: async (reviewId) => {
        const response = await axios.get(ENDPOINTS.REVIEWS.GET_COMMENTS(reviewId));
        return response.data;
    },

    // Eliminar comentario
    deleteComment: async (reviewId, commentId) => {
        const response = await axios.delete(ENDPOINTS.REVIEWS.DELETE_COMMENT(reviewId, commentId));
        return response.data;
    },

    // Reportar reseña
    reportReview: async (reviewId, reason) => {
        const response = await axios.post(ENDPOINTS.REVIEWS.REPORT(reviewId), { reason });
        return response.data;
    },

    // Reportar comentario
    reportComment: async (commentId, reason, details) => {
        const response = await axios.post(`/reviews/comments/${commentId}/report`, { reason, details });
        return response.data;
    }
};

export default reviewService;
