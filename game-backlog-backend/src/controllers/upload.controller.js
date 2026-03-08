const multer = require('multer');
const User = require('../models/user.model');
const sharp = require('sharp');
const { fromBuffer } = require('file-type');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

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
        fileSize: 10 * 1024 * 1024 // 10MB para soportar banners y GIFs pesados
    },
    fileFilter: fileFilter
});

// Helper para subir un buffer a Cloudinary mediante streams
const uploadToCloudinary = (buffer, folder, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: `game-backlog/${folder}`, ...options },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

// Helper para extraer el public_id de una URL de Cloudinary
const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    const parts = url.split('/');
    const fileWithExtension = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const projectFolder = parts[parts.length - 3];
    const id = fileWithExtension.split('.')[0];
    return `${projectFolder}/${folder}/${id}`;
};

// Controlador para subir y actualizar
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const detected = await fromBuffer(req.file.buffer);
        if (!detected || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(detected.mime)) {
            return res.status(400).json({ error: 'Tipo de archivo de avatar no permitido' });
        }

        const userId = req.user.userId;
        const isGif = detected.mime === 'image/gif';

        let avatarUrl = null;
        let avatarStaticUrl = null;

        if (isGif) {
            // Subir el GIF original directamente a Cloudinary
            const gifResult = await uploadToCloudinary(req.file.buffer, 'avatars');
            avatarUrl = gifResult.secure_url;

            // Generar thumbnail estático del primer frame (1 frame -> sharp -> webp buffer)
            const thumbBuffer = await sharp(req.file.buffer, { pages: 1 })
                .resize(400, 400, { fit: 'cover', position: 'center' })
                .webp({ quality: 80 })
                .toBuffer();

            const staticResult = await uploadToCloudinary(thumbBuffer, 'avatars');
            avatarStaticUrl = staticResult.secure_url;

        } else {
            // Procesar imagen normal con sharp: 400x400, convert to webp buffer
            const optimizedBuffer = await sharp(req.file.buffer)
                .resize(400, 400, { fit: 'cover', position: 'center' })
                .webp({ quality: 80 })
                .toBuffer();

            const uploadResult = await uploadToCloudinary(optimizedBuffer, 'avatars');
            avatarUrl = uploadResult.secure_url;
        }

        // Obtener el usuario actual para borrar archivos anteriores en Cloudinary
        const user = await User.findById(userId);
        const filesToDelete = [];
        if (user.avatar_url && user.avatar_url.includes('cloudinary.com')) {
            filesToDelete.push(getPublicIdFromUrl(user.avatar_url));
        }
        if (user.avatar_static_url && user.avatar_static_url.includes('cloudinary.com')) {
            filesToDelete.push(getPublicIdFromUrl(user.avatar_static_url));
        }

        // Eliminar imágenes antiguas de Cloudinary (fire and forget)
        filesToDelete.forEach(publicId => {
            if (publicId) cloudinary.uploader.destroy(publicId).catch(err => console.error('Error deleting from Cloudinary:', err));
        });

        // Actualizar base de datos
        const updatedUser = await User.updateAvatar(userId, avatarUrl, avatarStaticUrl);

        res.json({
            message: 'Avatar actualizado y optimizado exitosamente en Cloudinary',
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

        // Borrar archivos de Cloudinary
        if (user.avatar_url && user.avatar_url.includes('cloudinary.com')) {
            const publicId = getPublicIdFromUrl(user.avatar_url);
            if (publicId) await cloudinary.uploader.destroy(publicId);
        }
        if (user.avatar_static_url && user.avatar_static_url.includes('cloudinary.com')) {
            const publicId = getPublicIdFromUrl(user.avatar_static_url);
            if (publicId) await cloudinary.uploader.destroy(publicId);
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

// Controlador para subir y actualizar banner
const uploadBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const detected = await fromBuffer(req.file.buffer);
        if (!detected || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(detected.mime)) {
            return res.status(400).json({ error: 'Tipo de archivo de banner no permitido' });
        }

        const userId = req.user.userId;

        // Procesar imagen con sharp: 1920x400 (aspect ratio super panorámico), crop center, convert to webp
        const optimizedBuffer = await sharp(req.file.buffer)
            .resize(1920, 480, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 80 })
            .toBuffer();

        // Subir a Cloudinary
        const uploadResult = await uploadToCloudinary(optimizedBuffer, 'banners');
        const bannerUrl = uploadResult.secure_url;

        // Obtener el usuario actual para borrar su banner anterior si existe en Cloudinary
        const user = await User.findById(userId);
        if (user.banner_url && user.banner_url.includes('cloudinary.com')) {
            const publicId = getPublicIdFromUrl(user.banner_url);
            if (publicId) {
                cloudinary.uploader.destroy(publicId).catch(err => console.error('Error deleting banner from Cloudinary:', err));
            }
        }

        // Actualizar base de datos
        const updatedUser = await User.updateBanner(userId, bannerUrl);

        res.json({
            message: 'Banner actualizado y optimizado exitosamente en Cloudinary',
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

        // Borrar archivo de Cloudinary
        if (user.banner_url && user.banner_url.includes('cloudinary.com')) {
            const publicId = getPublicIdFromUrl(user.banner_url);
            if (publicId) await cloudinary.uploader.destroy(publicId);
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
