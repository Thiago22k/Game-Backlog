const express = require('express');
const router = express.Router();
const steamController = require('../controllers/steam.controller');
const { authenticateToken } = require('../middlewares/auth');


const jwt = require('jsonwebtoken');

const optionalAuth = (req, _res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (token) {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        }
    } catch {
        // Continuar como invitado si el token no es válido o expiró
    }
    next();
};

// Públicas: flujo OpenID y finalización de registro con Steam
router.get('/login', steamController.startLogin);
router.get('/callback', steamController.callback);
router.get('/games/:igdbGameId/achievements', optionalAuth, steamController.getGameAchievements);
router.get('/games/:igdbGameId/price', steamController.getGamePrice);
router.post('/complete-signup', steamController.completeSignup);
router.get('/users/:username/achievements-summary', steamController.getUserAchievementsSummary);

// Protegidas
router.post('/link', authenticateToken, steamController.startLink);
router.get('/status', authenticateToken, steamController.getStatus);
router.delete('/unlink', authenticateToken, steamController.unlink);
router.get('/import/preview', authenticateToken, steamController.getImportPreview);
router.post('/import/commit', authenticateToken, steamController.commitImport);
router.post('/sync', authenticateToken, steamController.syncNow);
router.patch('/preferences', authenticateToken, steamController.updatePreferences);

module.exports = router;