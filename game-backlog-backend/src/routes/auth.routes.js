const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticateToken = require('../middlewares/auth');

// Rutas públicas (ya tienen rate limiting desde server.js)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas (requieren autenticación)
router.get('/me', authenticateToken, authController.getProfile);

module.exports = router;