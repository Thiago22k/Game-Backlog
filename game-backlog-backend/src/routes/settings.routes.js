const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const authenticateToken = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.put('/change-password', authenticateToken, settingsController.changePassword);
router.put('/update-email', authenticateToken, settingsController.updateEmail);
router.put('/update-username', authenticateToken, settingsController.updateUsername);
router.delete('/delete-account', authenticateToken, settingsController.deleteAccount);

module.exports = router;