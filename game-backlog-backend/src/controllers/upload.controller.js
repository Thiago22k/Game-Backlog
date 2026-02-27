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
        fileSize: 10 * 1024 * 1024 // Aumentado a 10MB para soportar banners y GIFs pesados
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
        const isGif = req.file.mimetype === 'image/gif';

        // Generar nombre de archivo único
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = isGif ? 'gif' : 'webp';
        const fileName = `avatar-${userId}-${uniqueSuffix}.${extension}`;
        const filePath = path.join(uploadDir, fileName);
        let avatarUrl = `/uploads/avatars/${fileName}`;
        let avatarStaticUrl = null;

        if (isGif) {
            // Guardar GIF original (validación de tamaño se hace en multer, pero ProfileLayout enviará máx 8MB)
            fs.writeFileSync(filePath, req.file.buffer);

            // Generar thumbnail estático del primer frame
            const thumbName = `avatar-${userId}-${uniqueSuffix}-static.webp`;
            const thumbPath = path.join(uploadDir, thumbName);
            await sharp(req.file.buffer, { pages: 1 }) // pages: 1 extrae solo el primer frame
                .resize(400, 400, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 80 })
                .toFile(thumbPath);

            avatarStaticUrl = `/uploads/avatars/${thumbName}`;
        } else {
            // Procesar imagen normal con sharp: 400x400, convert to webp
            await sharp(req.file.buffer)
                .resize(400, 400, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 80 })
                .toFile(filePath);
        }

        // Obtener el usuario actual para borrar archivos anteriores
        const user = await User.findById(userId);
        const filesToDelete = [];
        if (user.avatar_url && !user.avatar_url.includes('default')) {
            filesToDelete.push(user.avatar_url);
        }
        if (user.avatar_static_url) {
            filesToDelete.push(user.avatar_static_url);
        }

        filesToDelete.forEach(fileUrl => {
            const fullPath = path.join(__dirname, '..', '..', 'public', fileUrl.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });

        // Actualizar base de datos
        const updatedUser = await User.updateAvatar(userId, avatarUrl, avatarStaticUrl);

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

        // Borrar archivos físicos si existen
        const filesToDelete = [];
        if (user.avatar_url && !user.avatar_url.includes('default')) {
            filesToDelete.push(user.avatar_url);
        }
        if (user.avatar_static_url) {
            filesToDelete.push(user.avatar_static_url);
        }

        filesToDelete.forEach(fileUrl => {
            const fullPath = path.join(__dirname, '..', '..', 'public', fileUrl.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });

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

// Asegurar que exista el directorio para banners
const bannerUploadDir = 'public/uploads/banners';
if (!fs.existsSync(bannerUploadDir)) {
    fs.mkdirSync(bannerUploadDir, { recursive: true });
}

// Controlador para subir y actualizar banner
const uploadBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const userId = req.user.userId;

        // Generar nombre de archivo único (.webp)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `banner-${userId}-${uniqueSuffix}.webp`;
        const filePath = path.join(bannerUploadDir, fileName);
        const bannerUrl = `/uploads/banners/${fileName}`;

        // Procesar imagen con sharp: 1920x400 (aspect ratio super panorámico), crop center, convert to webp
        await sharp(req.file.buffer)
            .resize(1920, 480, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 80 })
            .toFile(filePath);

        // Obtener el usuario actual para borrar su banner anterior si existe
        const user = await User.findById(userId);
        if (user.banner_url) {
            const oldBannerPath = path.join(__dirname, '..', '..', 'public', user.banner_url.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(oldBannerPath)) {
                fs.unlinkSync(oldBannerPath);
            }
        }

        // Actualizar base de datos
        const updatedUser = await User.updateBanner(userId, bannerUrl);

        res.json({
            message: 'Banner actualizado y optimizado exitosamente',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error en uploadBanner:', error);
        res.status(500).json({ error: 'Error al procesar y subir el banner' });
    }
};

// Controlador para eliminar el banner
const deleteBanner = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user.banner_url) {
            return res.status(400).json({ error: 'No tienes un banner personalizado para eliminar' });
        }

        // Borrar archivo físico si existe
        const bannerPath = path.join(__dirname, '..', '..', 'public', user.banner_url.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(bannerPath)) {
            fs.unlinkSync(bannerPath);
        }

        // Actualizar base de datos a null
        const updatedUser = await User.updateBanner(userId, null);

        res.json({
            message: 'Banner eliminado exitosamente',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error en deleteBanner:', error);
        res.status(500).json({ error: 'Error al eliminar el banner' });
    }
};

module.exports = {
    upload,
    uploadAvatar,
    deleteAvatar,
    uploadBanner,
    deleteBanner
};
