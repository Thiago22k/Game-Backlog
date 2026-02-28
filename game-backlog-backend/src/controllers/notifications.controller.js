const Notification = require('../models/notification.model');

// GET /api/notifications
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;

        const [notifications, unreadCount, totalCount] = await Promise.all([
            Notification.getRecentForUser(userId, limit, offset),
            Notification.countUnread(userId),
            Notification.countTotal(userId),
        ]);

        const hasMore = offset + notifications.length < totalCount;

        res.json({ notifications, unreadCount, hasMore, totalCount });
    } catch (error) {
        console.error('Error en getNotifications:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
};

// PUT /api/notifications/read — mark all as read
const markAllRead = async (req, res) => {
    try {
        await Notification.markAllRead(req.user.userId);
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error en markAllRead:', error);
        res.status(500).json({ error: 'Error al marcar notificaciones como leídas' });
    }
};

// PUT /api/notifications/:id/read — mark one as read
const markOneRead = async (req, res) => {
    try {
        await Notification.markOneRead(parseInt(req.params.id), req.user.userId);
        res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('Error en markOneRead:', error);
        res.status(500).json({ error: 'Error al marcar notificación como leída' });
    }
};

module.exports = { getNotifications, markAllRead, markOneRead };
