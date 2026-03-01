const Moderation = require('../models/moderation.model');
const Review = require('../models/review.model');
const User = require('../models/user.model');
const Collection = require('../models/collection.model');

const moderationController = {
    async getPendingReports(req, res) {
        try {
            const reviewReports = await Moderation.getPendingReviewReports();
            const commentReports = await Moderation.getPendingReviewCommentReports();
            const profileReports = await Moderation.getPendingProfileReports();
            const collectionReports = await Moderation.getPendingCollectionReports();
            const collectionCommentReports = await Moderation.getPendingCollectionCommentReports();

            // Formatear reportes para el frontend de forma unificada si es necesario
            const formattedReviewReports = reviewReports.map(r => ({ ...r, type: 'review' }));
            const formattedCommentReports = commentReports.map(r => ({ ...r, type: 'comment' }));
            const formattedProfileReports = profileReports.map(r => ({ ...r, type: 'profile' }));
            const formattedCollectionReports = collectionReports.map(r => ({ ...r, type: 'collection' }));
            const formattedCollectionCommentReports = collectionCommentReports.map(r => ({ ...r, type: 'collection_comment' }));

            const allReports = [...formattedReviewReports, ...formattedCommentReports, ...formattedProfileReports, ...formattedCollectionReports, ...formattedCollectionCommentReports]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            res.json(allReports);
        } catch (error) {
            console.error('Error fetching pending reports:', error);
            res.status(500).json({ error: 'Failed to fetch pending reports' });
        }
    },

    async updateReportStatus(req, res) {
        try {
            const { type, id } = req.params;
            const { status } = req.body;

            if (!['resolved', 'dismissed'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            let updatedReport;
            if (type === 'review') {
                updatedReport = await Moderation.updateReviewReportStatus(id, status);
            } else if (type === 'comment') {
                updatedReport = await Moderation.updateReviewCommentReportStatus(id, status);
            } else if (type === 'profile') {
                updatedReport = await Moderation.updateProfileReportStatus(id, status);
            } else if (type === 'collection') {
                updatedReport = await Moderation.updateCollectionReportStatus(id, status);
            } else if (type === 'collection_comment') {
                updatedReport = await Moderation.updateCollectionCommentReportStatus(id, status);
            } else {
                return res.status(400).json({ error: 'Invalid report type' });
            }

            if (!updatedReport) {
                return res.status(404).json({ error: 'Report not found' });
            }

            res.json({ message: 'Report status updated successfully', report: updatedReport });
        } catch (error) {
            console.error('Error updating report status:', error);
            res.status(500).json({ error: 'Failed to update report status' });
        }
    },

    async takeAction(req, res) {
        try {
            const { id: reportId } = req.params;
            const { action, reportData } = req.body;

            // Identificamos el tipo de reporte por los datos enviados o hacemos queries, 
            // pero si el frontend manda reportData, lo usamos para hacer las acciones correspondientes
            if (!reportData || !action) {
                return res.status(400).json({ error: 'Missing action or report data' });
            }

            if (action === 'delete_review') {
                if (!reportData.review_id) return res.status(400).json({ error: 'Missing review ID' });

                await Review.deleteReviewById(reportData.review_id);
                // Si todo sale bien, podríamos marcar el reporte como resuelto
                await Moderation.updateReviewReportStatus(reportId, 'resolved');

                return res.json({ message: 'Review deleted successfully and report resolved' });
            }

            if (action === 'delete_collection') {
                if (!reportData.collection_id) return res.status(400).json({ error: 'Missing collection ID' });

                await Collection.deleteCollection(reportData.collection_id, reportData.reported_user_id);
                // Marcar reporte como resuelto
                await Moderation.updateCollectionReportStatus(reportId, 'resolved');

                return res.json({ message: 'Collection deleted successfully and report resolved' });
            }

            if (action === 'delete_comment') {
                if (!reportData.comment_id) return res.status(400).json({ error: 'Missing comment ID' });

                await Review.deleteComment(reportData.comment_id, reportData.reported_user_id);
                // Marcar reporte como resuelto
                await Moderation.updateReviewCommentReportStatus(reportId, 'resolved');

                return res.json({ message: 'Comment deleted successfully and report resolved' });
            }

            if (action === 'delete_collection_comment') {
                if (!reportData.comment_id) return res.status(400).json({ error: 'Missing comment ID' });

                // Reuse the same controller or model method if we had one. Wait, we need to call Collection.deleteComment
                await Collection.deleteComment(reportData.comment_id, reportData.reported_user_id);

                // Marcar reporte como resuelto
                await Moderation.updateCollectionCommentReportStatus(reportId, 'resolved');

                return res.json({ message: 'Collection comment deleted successfully and report resolved' });
            }

            if (action === 'ban_user') {
                if (!reportData.reported_user_id) return res.status(400).json({ error: 'Missing reported user ID' });

                // Banear usuario (Soft delete)
                await User.banUser(reportData.reported_user_id);

                // Marcar reporte como resuelto
                if (reportData.type === 'review') await Moderation.updateReviewReportStatus(reportId, 'resolved');
                else if (reportData.type === 'comment') await Moderation.updateReviewCommentReportStatus(reportId, 'resolved');
                else if (reportData.type === 'profile') await Moderation.updateProfileReportStatus(reportId, 'resolved');
                else if (reportData.type === 'collection') await Moderation.updateCollectionReportStatus(reportId, 'resolved');
                else if (reportData.type === 'collection_comment') await Moderation.updateCollectionCommentReportStatus(reportId, 'resolved');

                return res.json({ message: 'User banned successfully and report resolved' });
            }

            return res.status(400).json({ error: 'Unknown action' });
        } catch (error) {
            console.error('Error taking moderation action:', error);
            res.status(500).json({ error: 'Failed to take moderation action' });
        }
    },

    // --- USER MANAGEMENT ---

    async searchUsers(req, res) {
        try {
            const { q } = req.query;
            const users = await Moderation.searchUsers(q);
            res.json(users);
        } catch (error) {
            console.error('Error searching users:', error);
            res.status(500).json({ error: 'Failed to search users' });
        }
    },

    async updateUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!['admin', 'user'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }

            // Evitar que el admin activo se quite su propio rol por error
            if (req.user.userId === parseInt(id) && role !== 'admin') {
                return res.status(403).json({ error: 'You cannot demote yourself' });
            }

            const updatedUser = await Moderation.updateUserRole(id, role);
            if (!updatedUser) return res.status(404).json({ error: 'User not found' });

            res.json(updatedUser);
        } catch (error) {
            console.error('Error updating user role:', error);
            res.status(500).json({ error: 'Failed to update user role' });
        }
    },

    async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['active', 'banned'].includes(status)) {
                return res.status(400).json({ error: 'status must be active or banned' });
            }

            // Evitar autoban
            if (req.user.userId === parseInt(id) && status === 'banned') {
                return res.status(403).json({ error: 'You cannot ban yourself' });
            }

            const updatedUser = await Moderation.updateUserStatus(id, status);
            if (!updatedUser) return res.status(404).json({ error: 'User not found' });

            res.json(updatedUser);
        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({ error: 'Failed to update user status' });
        }
    }
};

module.exports = moderationController;
