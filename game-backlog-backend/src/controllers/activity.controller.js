const Activity = require('../models/activity.model');
const User = require('../models/user.model');

// Obtener la actividad reciente de un usuario
const getUserActivityFeed = async (req, res) => {
    try {
        const { username } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        // Buscar el ID del usuario por nombre
        const user = await User.findByUsername(username);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Checking if profile is private
        const isProfilePublic = user.is_profile_public;
        const requestingUserId = req.user?.userId;

        if (!isProfilePublic && user.id !== requestingUserId) {
            return res.json({
                activities: [],
                is_profile_public: false,
                message: 'El perfil es privado.'
            });
        }

        // Buscar actividades en la BD
        const activities = await Activity.getUserActivity(user.id, limit);

        res.json({
            activities,
            is_profile_public: true
        });

    } catch (error) {
        console.error('Error en getUserActivityFeed:', error);
        res.status(500).json({ error: 'Error al obtener la actividad del usuario' });
    }
};

module.exports = {
    getUserActivityFeed
};
