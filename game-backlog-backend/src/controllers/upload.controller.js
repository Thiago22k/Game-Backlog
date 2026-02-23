const multer = require('multer');
const path = require('path');
const User = require('../models/user.model');
const fs = require('fs');
const sharp = require('sharp');

// Asegurar que exista el directorio
const uploadDir = 'public/uploads/avatars';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de multer: Usar memoria para procesar con sharp después
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Solo aceptar imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('No es un archivo de imagen válido'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite 5MB
    },
    fileFilter: fileFilter
});

// Controlador para subir y actualizar
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const userId = req.user.userId;

        // Generar nombre de archivo único (.webp)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `avatar-${userId}-${uniqueSuffix}.webp`;
        const filePath = path.join(uploadDir, fileName);
        const avatarUrl = `/uploads/avatars/${fileName}`;

        // Procesar imagen con sharp: 400x400, crop center, convert to webp
        await sharp(req.file.buffer)
            .resize(400, 400, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 80 })
            .toFile(filePath);

        // Obtener el usuario actual para borrar su avatar anterior si existe (y no es el default)
        const user = await User.findById(userId);
        if (user.avatar_url && !user.avatar_url.includes('default')) {
            const oldAvatarPath = path.join(__dirname, '..', '..', 'public', user.avatar_url.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        // Actualizar base de datos
        const updatedUser = await User.updateAvatar(userId, avatarUrl);

        res.json({
            message: 'Avatar actualizado y optimizado exitosamente',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error en uploadAvatar:', error);
        res.status(500).json({ error: 'Error al procesar y subir el avatar' });
    }
};

// Controlador para eliminar el avatar
const deleteAvatar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user.avatar_url || user.avatar_url.includes('default')) {
            return res.status(400).json({ error: 'No tienes un avatar personalizado para eliminar' });
        }

        // Borrar archivo físico si existe
        const avatarPath = path.join(__dirname, '..', '..', 'public', user.avatar_url.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
        }

        // Actualizar base de datos a null
        const updatedUser = await User.updateAvatar(userId, null);

        res.json({
            message: 'Avatar eliminado exitosamente',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error en deleteAvatar:', error);
        res.status(500).json({ error: 'Error al eliminar el avatar' });
    }
};

module.exports = {
    upload,
    uploadAvatar,
    deleteAvatar
};
