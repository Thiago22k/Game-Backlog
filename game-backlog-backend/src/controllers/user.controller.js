const User = require('../models/user.model');

const userController = {
    async reportUser(req, res) {
        try {
            const { id: reportedUserId } = req.params;
            const reporterId = req.user.userId;
            const { reason, details } = req.body;

            if (!reason) {
                return res.status(400).json({ error: 'Se requiere una razón para el reporte' });
            }

            if (parseInt(reportedUserId) === reporterId) {
                return res.status(400).json({ error: 'No puedes reportar tu propio perfil' });
            }

            // Verificar si el usuario a reportar existe
            const reportedUser = await User.findById(reportedUserId);
            if (!reportedUser) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const report = await User.reportProfile(reportedUserId, reporterId, reason, details);
            res.status(201).json({ message: 'Reporte de perfil enviado exitosamente', report });

        } catch (error) {
            console.error('Error reporting user:', error);
            if (error.message.includes('Ya has reportado') || error.code === '23505') {
                return res.status(400).json({ error: 'Ya has reportado este usuario previamente.' });
            }
            res.status(500).json({ error: 'Error interno al reportar perfil' });
        }
    }
};

module.exports = userController;
