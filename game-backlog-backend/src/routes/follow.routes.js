const express = require('express');
const router = express.Router();
const followController = require('../controllers/follow.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');

// Funciones para likes/follows (requieren estar logueado)
router.post('/follows/:userId', authenticateToken, followController.followUser);
router.delete('/follows/:userId', authenticateToken, followController.unfollowUser);
router.get('/follows/:userId/status', authenticateToken, followController.checkFollowStatus);

// Público: ver quién sigue a quién
router.get('/users/:username/social', optionalAuth, followController.getProfileSocialData);

module.exports = router;
