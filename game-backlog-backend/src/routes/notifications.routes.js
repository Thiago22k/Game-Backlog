const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const notificationsController = require('../controllers/notifications.controller');

router.get('/', authenticateToken, notificationsController.getNotifications);
router.put('/read', authenticateToken, notificationsController.markAllRead);
router.put('/:id/read', authenticateToken, notificationsController.markOneRead);

module.exports = router;
