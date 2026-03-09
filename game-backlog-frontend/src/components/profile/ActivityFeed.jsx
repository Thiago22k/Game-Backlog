import React from 'react';
import { Star, Check, Play, ShoppingCart, Trash2, Library, Archive, Gamepad2, Plus, ArrowRight, Heart, MessageSquare, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
    completed: { label: 'completed', Icon: Check, color: 'text-green-500', bg: 'bg-green-500/10' },
    playing: { label: 'started playing', Icon: Play, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    wishlist: { label: 'wishlisted', Icon: ShoppingCart, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    backlog: { label: 'added to backlog', Icon: Archive, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    dropped: { label: 'dropped', Icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10' }
};

const ActivityItem = ({ activity, username }) => {
    const { action_type, entity_type, metadata, created_at } = activity;
    const timeAgo = formatTimeAgo(created_at ? new Date(created_at) : new Date());

    // Render helpers based on action type
    if (action_type === 'ADDED_GAME' || action_type === 'STATUS_CHANGED') {
        const status = metadata.new_status || metadata.status;
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.backlog;
        const Icon = config.Icon;

        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 items-center">
                <div className={`shrink-0 p-3 rounded-xl ${config.bg}`}>
                    <Icon className={config.color} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> {config.label}{" "}
                        <Link to={`/game/${metadata.game_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.game_name}
                        </Link>
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    if (action_type === 'RATED_GAME') {
        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 items-center">
                <div className="shrink-0 p-3 rounded-xl bg-orange-500/10">
                    <Star className="text-orange-500 fill-orange-500" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> rated{" "}
                        <Link to={`/game/${metadata.game_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.game_name}
                        </Link>
                        {" "}<span className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{metadata.new_rating}/5</span>
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    if (action_type === 'CREATED_COLLECTION') {
        const isPublic = metadata.is_public !== false;
        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 items-center">
                <div className="shrink-0 p-3 rounded-xl bg-indigo-500/10">
                    <Library className="text-indigo-400" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> created a new {isPublic ? 'public' : 'private'} collection:{" "}
                        <Link to={`/collections/${activity.entity_id}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.collection_name}
                        </Link>
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    if (action_type === 'LIKED_GAME') {
        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 items-center">
                <div className="shrink-0 p-3 rounded-xl bg-pink-500/10">
                    <Heart className="text-pink-500 fill-pink-500" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> liked{" "}
                        <Link to={`/game/${metadata.game_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.game_name}
                        </Link>
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    if (action_type === 'LIKED_COLLECTION') {
        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 items-center">
                <div className="shrink-0 p-3 rounded-xl bg-pink-500/10">
                    <Heart className="text-pink-500 fill-pink-500" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> liked the collection:{" "}
                        <Link to={`/collections/${activity.entity_id}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.collection_name}
                        </Link>
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    if (action_type === 'COMMENTED_COLLECTION') {
        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                <div className="shrink-0 p-3 rounded-xl bg-cyan-500/10 h-fit">
                    <MessageSquare className="text-cyan-400" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> commented on:{" "}
                        <Link to={`/collections/${activity.entity_id}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.collection_name}
                        </Link>
                    </p>
                    {metadata.comment_preview && (
                        <div className="mt-2 bg-black/20 p-3 rounded-lg border border-white/5">
                            <p className="text-sm text-gray-400 italic">"{metadata.comment_preview}"</p>
                        </div>
                    )}
                    <span className="text-xs text-gray-500 mt-2 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    if (action_type === 'CREATE_REVIEW' || action_type === 'UPDATE_REVIEW') {
        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                <div className="shrink-0 p-3 rounded-xl bg-primary-yellow/10 h-fit">
                    <MessageSquare className="text-primary-yellow" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> {action_type === 'CREATE_REVIEW' ? 'wrote' : 'updated'} a review for{" "}
                        <Link to={`/game/${metadata.game_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.game_name}
                        </Link>
                        {" "}<span className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{metadata.rating}/5</span>
                    </p>
                    {metadata.review_preview && (
                        <div className="mt-2 bg-black/20 p-3 rounded-lg border border-white/5">
                            <p className="text-sm text-gray-400 italic">"{metadata.review_preview}"</p>
                        </div>
                    )}
                    <span className="text-xs text-gray-500 mt-2 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    if (action_type === 'STARTED_FOLLOWING') {
        return (
            <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 items-center">
                <div className="shrink-0 p-3 rounded-xl bg-teal-500/10">
                    <UserPlus className="text-teal-400" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words whitespace-normal">
                        <span className="font-semibold text-white">{username}</span> started following{" "}
                        <Link to={`/profile/${metadata.target_username}`} className="font-bold text-primary-yellow hover:underline">
                            {metadata.target_username}
                        </Link>
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">{timeAgo}</span>
                </div>
            </div>
        );
    }

    return null;
};

// Main Feed Component
const ActivityFeed = ({ activities, username, loading, isOwner }) => {
    if (loading) {
        return (
            <div className="bg-primary-navy-dark rounded-xl border border-gray-800 p-6 shadow-xl animate-pulse">
                <div className="h-6 w-1/3 bg-gray-700 rounded mb-6"></div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 mb-4">
                        <div className="w-12 h-12 bg-gray-700 rounded-xl shrink-0"></div>
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-800 rounded w-1/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <div className="bg-primary-navy-dark rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gamepad2 className="text-gray-500" size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Recent Activity</h3>
                <p className="text-gray-400 text-sm">
                    {isOwner
                        ? "You haven't added any games or created collections recently."
                        : `${username} hasn't added any games or created collections recently.`}
                </p>
                {isOwner && (
                    <Link
                        to="/explore"
                        className="mt-6 px-6 py-2 bg-primary-yellow text-primary-navy-dark rounded-lg font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2"
                    >
                        Explore Games
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="bg-primary-navy-dark rounded-xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-800 bg-gray-900/40">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    Activity Feed
                </h3>
            </div>

            <div className="flex flex-col max-h-[500px] overflow-y-auto custom-scrollbar overflow-x-hidden">
                {activities.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} username={username} />
                ))}
            </div>
        </div>
    );
};

// Utility to format "time ago"
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
        }
    }
    return 'just now';
}

export default ActivityFeed;
