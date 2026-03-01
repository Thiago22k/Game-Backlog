const Follow = require('../models/follow.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const Activity = require('../models/activity.model');

// POST /api/follows/:userId
const followUser = async (req, res) => {
    try {
        const followerId = req.user.userId;
        const followingId = parseInt(req.params.userId, 10);

        if (followerId === followingId) {
            return res.status(400).json({ error: 'You cannot follow yourself' });
        }

        // Verificar que el usuario a seguir exista
        const targetUser = await User.findById(followingId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const alreadyFollowing = await Follow.isFollowing(followerId, followingId);
        if (alreadyFollowing) {
            return res.status(400).json({ error: 'You are already following this user' });
        }

        await Follow.followUser(followerId, followingId);

        // Notificar al usuario seguido (si no se sigue a sí mismo y para Follower esto pasa seguro por validación previa)
        await Notification.createNotification({
            recipientId: followingId,
            actorId: followerId,
            type: 'NEW_FOLLOWER',
            entityId: followingId.toString(),
            metadata: {}
        });

        // Registrar en el feed de actividad del seguidor
        await Activity.logActivity(
            followerId,
            'STARTED_FOLLOWING',
            'user',
            followingId.toString(),
            { target_username: targetUser.username }
        );

        res.status(200).json({ success: true, message: 'Successfully followed user' });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE /api/follows/:userId
const unfollowUser = async (req, res) => {
    try {
        const followerId = req.user.userId;
        const followingId = parseInt(req.params.userId, 10);

        const alreadyFollowing = await Follow.isFollowing(followerId, followingId);
        if (!alreadyFollowing) {
            return res.status(400).json({ error: 'You are not following this user' });
        }

        await Follow.unfollowUser(followerId, followingId);
        res.status(200).json({ success: true, message: 'Successfully unfollowed user' });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/follows/:userId/status
const checkFollowStatus = async (req, res) => {
    try {
        const followerId = req.user.userId;
        const followingId = parseInt(req.params.userId, 10);

        const isFollowing = await Follow.isFollowing(followerId, followingId);
        res.json({ isFollowing });
    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/users/:username/social
const getProfileSocialData = async (req, res) => {
    try {
        const { username } = req.params;
        const callerId = req.user?.userId || null;
        const targetUser = await User.findByUsername(username);

        if (!targetUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const [followers, following, counts] = await Promise.all([
            Follow.getFollowers(targetUser.id, callerId),
            Follow.getFollowing(targetUser.id, callerId),
            Follow.getFollowCounts(targetUser.id)
        ]);

        res.json({ followers, following, counts });
    } catch (error) {
        console.error('Error fetching profile social data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    followUser,
    unfollowUser,
    checkFollowStatus,
    getProfileSocialData
};
