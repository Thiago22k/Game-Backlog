const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { optionalAuth } = require('../middlewares/auth');

// GET /api/activity/users/:username - Obtener actividad de un usuario específico
// Usa optionalAuth para soportar que usuarios anónimos vean feeds de perfiles públicos, pero permitir que el dueño vea su feed privado
router.get('/users/:username', optionalAuth, activityController.getUserActivityFeed);

module.exports = router;
