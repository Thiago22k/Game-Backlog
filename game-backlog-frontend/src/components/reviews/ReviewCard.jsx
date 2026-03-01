import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { REVIEW_SUB_STATUSES } from '../../utils/constants';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import reviewService from '../../api/review.service';
import { useAuth } from '../../context/AuthContext';
import RatingBadge from '../common/RatingBadge';
import ConfirmModal from '../common/ConfirmModal';
import ReportModal from '../common/ReportModal';
import { Flag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAvatarUrl } from '../../utils/avatar';

const ReviewCard = ({ review, onReviewUpdated, onReviewDeleted }) => {
    const { user } = useAuth();
    const [showSpoilers, setShowSpoilers] = useState(false);
    const [likes, setLikes] = useState(parseInt(review.likes_count) || 0);
    const [hasLiked, setHasLiked] = useState(review.has_liked || false);
    const [isLiking, setIsLiking] = useState(false);

    // Comments
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [commentsCount, setCommentsCount] = useState(parseInt(review.comments_count) || 0);

    // Report Modal State
    const [reportModal, setReportModal] = useState({
        isOpen: false,
        type: 'review', // 'review' or 'reply'
        itemId: null,
        isSubmitting: false
    });

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'default',
        isLoading: false
    });

    const isAuthor = user?.id === review.user_id;

    // Sincronizar estado local si las props 'review' cambian (ej: re-fetch tras login)
    React.useEffect(() => {
        setHasLiked(review.has_liked || false);
        setLikes(parseInt(review.likes_count) || 0);
        setCommentsCount(parseInt(review.comments_count) || 0);
    }, [review]);

    // Helper to get translated status
    const getStatusLabel = (status) => {
        const labels = {
            completed: 'Completed',
            playing: 'Playing',
            backlog: 'Backlog',
            dropped: 'Dropped'
        };
        return labels[status] || status;
    };

    // Helper to get translated sub status
    const getSubStatusLabel = (status, subStatus) => {
        if (!subStatus) return null;
        const subList = REVIEW_SUB_STATUSES[status];
        if (!subList) return subStatus;
        const found = subList.find(s => s.value === subStatus);
        return found ? found.label : subStatus;
    };

    // Formatear date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: enUS });
    };

    const handleToggleLike = async () => {
        if (!user || isLiking) return;
        setIsLiking(true);
        try {
            const res = await reviewService.toggleLike(review.id);
            setHasLiked(res.liked);
            setLikes(prev => res.liked ? prev + 1 : prev - 1);
        } catch (error) {
            console.error('Error toggling like', error);
        } finally {
            setIsLiking(false);
        }
    };

    const loadComments = async () => {
        if (showComments) {
            setShowComments(false);
            return;
        }

        setIsLoadingComments(true);
        setShowComments(true);
        try {
            const data = await reviewService.getComments(review.id);
            setComments(data);
        } catch (error) {
            console.error('Error loading comments', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        try {
            const added = await reviewService.addComment(review.id, newComment);
            setComments([...comments, added]);
            setNewComment('');
            setCommentsCount(prev => prev + 1);
        } catch (error) {
            console.error('Error adding comment', error);
        }
    };

    const handleReport = (type = 'review', itemId = null) => {
        if (!user) {
            toast.error('Log in to report content');
            return;
        }
        setReportModal({
            isOpen: true,
            type,
            itemId: itemId || review.id,
            isSubmitting: false
        });
    };

    const onSubmitReport = async ({ reason, details }) => {
        setReportModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            if (reportModal.type === 'review') {
                await reviewService.reportReview(review.id, reason + (details ? `: ${details}` : ''));
            } else if (reportModal.type === 'reply') {
                await reviewService.reportComment(reportModal.itemId, reason, details);
            }
            toast.success("Report submitted successfully. Thank you!");
            setReportModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || "Error reporting content");
        } finally {
            setReportModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const handleDeleteReview = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Review',
            message: 'Are you sure you want to delete this review? This action will remove your rating and review content permanently.',
            variant: 'danger',
            confirmLabel: 'Delete Review',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await reviewService.deleteReview(review.igdb_game_id);
                    if (onReviewDeleted) {
                        onReviewDeleted(review.id);
                    }
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert(error.response?.data?.error || "Error deleting review");
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const handleDeleteComment = (commentId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Reply',
            message: 'Are you sure you want to delete this reply?',
            variant: 'danger',
            confirmLabel: 'Delete Reply',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await reviewService.deleteComment(review.id, commentId);
                    setComments(comments.filter(c => c.id !== commentId));
                    setCommentsCount(prev => Math.max(0, prev - 1));
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert(error.response?.data?.error || "Error deleting reply");
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const [isExpanded, setIsExpanded] = useState(false);
    const CONTENT_LIMIT = 500;
    const shouldTruncate = review.content && review.content.length > CONTENT_LIMIT;
    const displayedContent = isExpanded || !shouldTruncate
        ? review.content
        : review.content.substring(0, CONTENT_LIMIT) + '...';

    return (
        <div id={`review-${review.id}`} className="bg-primary-navy-dark rounded-xl p-5">
            {/* Header: User Info & Meta */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3 sm:gap-0">
                <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                    <Link to={`/profile/${review.username}`} className="block flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
                        <img
                            src={getAvatarUrl({
                                avatar_url: review.avatar_url,
                                avatar_static_url: review.avatar_static_url
                            }, { animated: false })}
                            alt={review.username}
                            className="w-10 h-10 rounded-full object-cover border border-gray-700 hover:border-primary-yellow transition-colors"
                            onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + review.username + '&background=random' }}
                        />
                    </Link>
                    <div>
                        <div className="font-semibold text-white flex items-center flex-wrap gap-y-1">
                            <Link to={`/profile/${review.username}`} className="hover:text-primary-yellow transition-colors hover:underline decoration-primary-yellow/30 underline-offset-4">
                                {review.username}
                            </Link>
                            <span className="text-gray-400 font-normal ml-1 mr-2">rated with</span>
                            <RatingBadge rating={parseFloat(review.rating)} size="sm" type="stars" />
                            {review.game_name && (
                                <Link to={`/games/${review.igdb_game_id}`} className="font-bold text-primary-yellow ml-1.5 hover:underline decoration-primary-yellow/30 underline-offset-4 transition-all hover:text-white">
                                    {review.game_name}
                                </Link>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(review.updated_at || review.created_at)}</p>
                    </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col sm:items-end gap-2 sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary-yellow/20 text-primary-yellow border border-primary-yellow whitespace-nowrap">
                            {getStatusLabel(review.status)}
                        </span>
                        {review.sub_status && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700 whitespace-nowrap">
                                {getSubStatusLabel(review.status, review.sub_status)}
                            </span>
                        )}
                        {review.platform && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-900/50 whitespace-nowrap">
                                {review.platform}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mb-4">
                {review.contains_spoiler && !showSpoilers && !isAuthor ? (
                    <div
                        onClick={() => setShowSpoilers(true)}
                        className="cursor-pointer bg-white/5 p-5 rounded-xl relative group transition-all duration-300 hover:bg-white/10 border border-dashed border-white/20 active:scale-[0.98]"
                    >
                        <div className="flex flex-wrap gap-x-2 gap-y-3 opacity-90 select-none">
                            {/* realistic redaction bars */}
                            {Array.from({ length: 24 }).map((_, i) => (
                                <span
                                    key={i}
                                    className="h-3.5 bg-white rounded-[1px] transform transition-all duration-500 group-hover:scale-x-105"
                                    style={{
                                        width: `${Math.floor(Math.random() * 50) + 40}px`,
                                        opacity: 0.85 + (Math.random() * 0.1)
                                    }}
                                ></span>
                            ))}
                        </div>
                        <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] group-hover:text-white transition-colors">
                                    Spoiler Content
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                                Click to reveal
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed overflow-hidden break-words">
                        {displayedContent}
                        {shouldTruncate && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-primary-yellow hover:text-white text-sm font-bold ml-2 transition-colors focus:outline-none"
                            >
                                {isExpanded ? 'See less' : 'Read more'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                        onClick={handleToggleLike}
                        disabled={!user || isLiking}
                        className={`flex items-center gap-2 text-sm transition-colors ${hasLiked ? 'text-primary-yellow' : 'text-gray-400 hover:text-gray-200'
                            } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-5 h-5" fill={hasLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                        <span>{likes} {likes === 1 ? 'Like' : 'Likes'}</span>
                    </button>

                    {/* Comment Button */}
                    <button
                        onClick={loadComments}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        <span>{commentsCount} {commentsCount === 1 ? 'Reply' : 'Replies'}</span>
                    </button>
                </div>

                <div className="flex gap-3">
                    {!isAuthor && (
                        <button
                            onClick={() => handleReport('review')}
                            className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                            title="Report review"
                        >
                            Report
                        </button>
                    )}
                    {isAuthor && onReviewUpdated && (
                        <button
                            onClick={() => onReviewUpdated(review)}
                            className="text-gray-500 hover:text-white text-sm transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {isAuthor && (
                        <button
                            onClick={handleDeleteReview}
                            className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                            title="Delete review"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Comments Section (Expanding) */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                    {isLoadingComments ? (
                        <div className="text-center py-4 text-gray-400">Loading replies...</div>
                    ) : (
                        <div className="space-y-4">
                            {comments.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center">No replies yet. Be the first!</p>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 group">
                                        <Link to={`/profile/${comment.username}`} className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
                                            <img
                                                src={getAvatarUrl({
                                                    avatar_url: comment.avatar_url,
                                                    avatar_static_url: comment.avatar_static_url
                                                }, { animated: false })}
                                                alt={comment.username}
                                                className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-primary-yellow transition-all"
                                                onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + comment.username + '&background=random' }}
                                            />
                                        </Link>
                                        <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <Link to={`/profile/${comment.username}`} className="font-medium text-sm text-gray-200 hover:text-primary-yellow transition-colors">
                                                        {comment.username}
                                                    </Link>
                                                    <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {(!user || user.id !== comment.user_id) && (
                                                        <button
                                                            onClick={() => handleReport('reply', comment.id)}
                                                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                                            title="Report reply"
                                                        >
                                                            <Flag size={14} />
                                                        </button>
                                                    )}
                                                    {user?.id === comment.user_id && (
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                                            title="Delete reply"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-gray-300 text-sm">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Add Comment */}
                            {user ? (
                                <form onSubmit={handleAddComment} className="flex gap-3 mt-4">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="flex-1 bg-primary-navy-dark border border-gray-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-yellow"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim()}
                                        className="bg-primary-yellow text-primary-navy rounded-full px-4 text-sm font-bold hover:bg-opacity-90 disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-2 text-sm text-gray-500">
                                    Log in to reply
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            <ReportModal
                isOpen={reportModal.isOpen}
                type={reportModal.type}
                title={reportModal.type === 'review' ? 'Report Review' : 'Report Reply'}
                options={reportModal.type === 'review' ? [
                    { value: 'inappropriate_content', label: 'Inappropriate Content' },
                    { value: 'spam', label: 'Spam' },
                    { value: 'spoiler', label: 'Spoiler without tag' },
                    { value: 'offensive', label: 'Offensive Content' },
                    { value: 'inaccurate', label: 'Inaccurate/Misleading' },
                    { value: 'other', label: 'Other' }
                ] : [
                    { value: 'harassment', label: 'Harassment' },
                    { value: 'hate_speech', label: 'Hate Speech' },
                    { value: 'spam', label: 'Spam' },
                    { value: 'inappropriate_language', label: 'Inappropriate Language' },
                    { value: 'other', label: 'Other' }
                ]}
                isSubmitting={reportModal.isSubmitting}
                onClose={() => setReportModal(prev => ({ ...prev, isOpen: false }))}
                onSubmit={onSubmitReport}
            />
            <ConfirmModal
                {...confirmModal}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default ReviewCard;
