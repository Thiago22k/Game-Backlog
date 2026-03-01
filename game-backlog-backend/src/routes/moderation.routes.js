const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role.middleware');

// Todas estas rutas requieren autenticación y rol de admin
router.use(authenticateToken, requireAdmin);

// Obtener reportes pendientes
router.get('/reports', moderationController.getPendingReports);

// Actualizar estado de reporte (resolver/desestimar)
// :type puede ser 'review', 'profile' o 'collection'
router.patch('/reports/:type/:id/status', moderationController.updateReportStatus);

// Tomar acción de moderación (eliminar reseña, banear usuario)
router.post('/reports/:id/action', moderationController.takeAction);

// --- USER MANAGEMENT ---

router.get('/users/search', moderationController.searchUsers);
router.patch('/users/:id/role', moderationController.updateUserRole);
router.patch('/users/:id/status', moderationController.updateUserStatus);

module.exports = router;
