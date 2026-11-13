const express = require('express');
const router = express.Router();
const steamController = require('../controllers/steam.controller');
const { authenticateToken } = require('../middlewares/auth');

// Pública: la visita el navegador al volver de Steam (identidad vía `state` firmado)
router.get('/callback', steamController.callback);

// Protegidas
router.post('/link', authenticateToken, steamController.startLink);
router.get('/status', authenticateToken, steamController.getStatus);
router.delete('/unlink', authenticateToken, steamController.unlink);

module.exports = router;
