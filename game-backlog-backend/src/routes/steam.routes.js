const express = require('express');
const router = express.Router();
const steamController = require('../controllers/steam.controller');
const { authenticateToken } = require('../middlewares/auth');

// Públicas: flujo OpenID y finalización de registro con Steam
router.get('/login', steamController.startLogin);
router.get('/callback', steamController.callback);
router.post('/complete-signup', steamController.completeSignup);

// Protegidas
router.post('/link', authenticateToken, steamController.startLink);
router.get('/status', authenticateToken, steamController.getStatus);
router.delete('/unlink', authenticateToken, steamController.unlink);
router.get('/import/preview', authenticateToken, steamController.getImportPreview);
router.post('/import/commit', authenticateToken, steamController.commitImport);

module.exports = router;