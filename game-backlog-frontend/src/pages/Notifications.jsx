import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { getAvatarUrl } from '../utils/avatar';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Bell, Check, Loader2 } from 'lucide-react';

const relativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const notifMessage = (notif) => {
    const actor = notif.actor_username || notif.metadata?.actor_username || 'Someone';
    const colName = notif.metadata?.collection_name || 'your collection';
    const gameName = notif.metadata?.game_name || notif.metadata?.gameName || 'a game';

    if (notif.type === 'LIKED_COLLECTION') {
        return <><span className="font-semibold text-white">@{actor}</span>{' liked your collection '}<span className="italic">«{colName}»</span></>;
    }
    if (notif.type === 'COMMENTED_COLLECTION') {
        const preview = notif.metadata?.comment_preview;
        return <><span className="font-semibold text-white">@{actor}</span>{' commented on '}<span className="italic">«{colName}»</span>{preview ? <><br /><span className="text-gray-500 text-sm">"{preview}"</span></> : null}</>;
    }
    if (notif.type === 'like_review') {
        return <><span className="font-semibold text-white">@{actor}</span>{' liked your review for '}<span className="italic">«{gameName}»</span></>;
    }
    if (notif.type === 'comment_review') {
        return <><span className="font-semibold text-white">@{actor}</span>{' commented on your review for '}<span className="italic">«{gameName}»</span></>;
    }
    if (notif.type === 'NEW_FOLLOWER') {
        return <><span className="font-semibold text-white">@{actor}</span>{' started following you'}</>;
    }
    return 'New notification';
};

const Notifications = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaginating, setIsPaginating] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const LIMIT = 20;

    const fetchNotifications = useCallback(async (currentPage, isLoadMore = false) => {
        try {
            if (!isLoadMore) setIsLoading(true);
            else setIsPaginating(true);

            const res = await axios.get(`/notifications?page=${currentPage}&limit=${LIMIT}`);
            const data = res.data;

            if (isLoadMore) {
                setNotifications(prev => [...prev, ...data.notifications]);
            } else {
                setNotifications(data.notifications);
            }

            setHasMore(data.hasMore);
            setUnreadCount(data.unreadCount);

        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
            setIsPaginating(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchNotifications(1);
    }, [isAuthenticated, fetchNotifications]);

    const handleLoadMore = () => {
        if (!hasMore || isPaginating) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNotifications(nextPage, true);
    };

    const handleMarkAllRead = async () => {
        if (unreadCount === 0 || isMarkingAll) return;
        try {
            setIsMarkingAll(true);
            await axios.put('/notifications/read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        } finally {
            setIsMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notif) => {
        // Mark as read locally and on server if unread
        if (!notif.is_read) {
            try {
                await axios.put(`/notifications/${notif.id}/read`);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error('Error marking one as read:', error);
            }
        }

        // Navigate
        if (notif.type === 'NEW_FOLLOWER') {
            navigate(`/profile/${notif.actor_username}`);
            return;
        }

        const isCollection = notif.type.includes('COLLECTION');
        const target = isCollection
            ? `/collections/${notif.entity_id}`
            : `/game/${notif.metadata?.game_slug || notif.metadata?.gameId}`;

        navigate(target);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-primary-navy">
                <Navbar />
                <div className="flex justify-center items-center h-[60vh]">
                    <p className="text-gray-400">Please log in to view notifications.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-primary-navy font-sans text-gray-200">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pt-24">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-gray-800 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary-navy-dark rounded-xl border border-gray-800">
                            <Bell className="w-6 h-6 text-primary-yellow" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Notifications</h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'You are all caught up!'}
                            </p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={isMarkingAll}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isMarkingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary-yellow animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-16 bg-primary-navy-dark rounded-2xl border border-gray-800">
                            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No notifications yet</h3>
                            <p className="text-gray-400">When someone interacts with your activity, it will appear here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-primary-navy-dark rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800 shadow-lg">
                                {notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer hover:bg-white/5 ${!notif.is_read ? 'bg-primary-yellow/5' : ''
                                            }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={getAvatarUrl({
                                                    avatar_url: notif.actor_avatar_url,
                                                    avatar_static_url: notif.actor_avatar_static_url
                                                }, { animated: false })}
                                                alt={notif.actor_username}
                                                className={`w-12 h-12 rounded-full object-cover transition-colors ${!notif.is_read ? 'ring-2 ring-primary-yellow ring-offset-2 ring-offset-primary-navy-dark' : 'border border-gray-700'}`}
                                                onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + notif.actor_username + '&background=random' }}
                                            />
                                            {!notif.is_read && (
                                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary-yellow border-2 border-primary-navy-dark rounded-full"></span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[48px]">
                                            <p className="text-gray-200 text-base leading-snug break-words pr-2">
                                                {notifMessage(notif)}
                                            </p>
                                            <span className="text-gray-500 text-xs mt-1.5 font-medium">
                                                {relativeTime(notif.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {hasMore && (
                                <div className="flex justify-center pt-6 pb-12">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={isPaginating}
                                        className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isPaginating && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isPaginating ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Notifications;
