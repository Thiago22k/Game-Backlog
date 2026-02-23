const express = require('express');
const router = express.Router();
const { upload, uploadAvatar, deleteAvatar } = require('../controllers/upload.controller');
const { authenticateToken } = require('../middlewares/auth');

// Ruta protegida para subir avatar. El campo form-data debe llamarse 'avatar'
router.post('/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticateToken, deleteAvatar);

// Manejo de errores de multer
router.use((error, req, res, next) => {
    if (error instanceof require('multer').MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'El archivo es demasiado grande (máximo 5MB)' });
        }
        return res.status(400).json({ error: error.message });
    } else if (error) {
        return res.status(400).json({ error: error.message });
    }
    next();
});

module.exports = router;
