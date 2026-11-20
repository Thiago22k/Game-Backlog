import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';

// --- BATCHING CACHE LAYER ---
// This lives outside the hook so it is shared across all component instances.
let batchQueue = new Set();
let batchTimeout = null;
let likesCache = {}; // { gameId: { likes_count: 0, user_has_liked: false } }
const listeners = {}; // { gameId: [callback1, callback2] }

const fetchBatch = async () => {
    if (batchQueue.size === 0) return;
    const idsToFetch = Array.from(batchQueue);
    batchQueue.clear();

    try {
        const res = await axios.get(`/games/likes/bulk?ids=${idsToFetch.join(',')}`);
        const data = res.data || {};

        idsToFetch.forEach(id => {
            const stats = data[id] || { likes_count: 0, user_has_liked: false };
            likesCache[id] = stats;
            // Notify all components waiting for this game ID
            if (listeners[id]) {
                listeners[id].forEach(cb => cb(stats));
            }
        });
    } catch (err) {
        // Silently fail - likes are non-critical
        idsToFetch.forEach(id => {
            // Let components finish loading state even on error
            if (listeners[id]) {
                listeners[id].forEach(cb => cb({ likes_count: 0, user_has_liked: false }));
            }
        });
    }
};

const registerForBatch = (gameId, callback) => {
    if (!listeners[gameId]) listeners[gameId] = [];
    listeners[gameId].push(callback);

    if (likesCache[gameId] !== undefined) {
        // Already cached, return synchronously
        callback(likesCache[gameId]);
        // Also queue a background refresh if needed, but for likes caching is fine.
        return;
    }

    batchQueue.add(gameId);
    if (batchTimeout === null) {
        batchTimeout = setTimeout(() => {
            batchTimeout = null;
            fetchBatch();
        }, 50); // 50ms batch window allows all grid cards to mount and register
    }
};

const unregisterForBatch = (gameId, callback) => {
    if (listeners[gameId]) {
        listeners[gameId] = listeners[gameId].filter(cb => cb !== callback);
        if (listeners[gameId].length === 0) {
            delete listeners[gameId];
        }
    }
};

export const invalidateLikesCache = () => {
    likesCache = {};
};

// --- HOOK ---
export const useGameLikes = (igdbGameId) => {
    const { isAuthenticated } = useAuth();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    // Invalidate cache globalmente si cambia el estado de autenticación
    useEffect(() => {
        invalidateLikesCache();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!igdbGameId) return;

        const handleStatusUpdate = (stats) => {
            setLiked(stats.user_has_liked);
            setLikesCount(stats.likes_count);
            setLoading(false); // only finish loading after we get the batch result
        };

        setLoading(true);
        registerForBatch(igdbGameId, handleStatusUpdate);

        return () => {
            unregisterForBatch(igdbGameId, handleStatusUpdate);
        };
    }, [igdbGameId, isAuthenticated]);

    // Toggle like
    const toggleLike = useCallback(async (gameName, coverUrl) => {
        if (!isAuthenticated || toggling) return;
        setToggling(true);

        // Optimistic update
        const wasLiked = liked;
        const newCount = wasLiked ? likesCount - 1 : likesCount + 1;

        setLiked(!wasLiked);
        setLikesCount(newCount);

        // Update cache so if user navigates away and back, it's correct
        likesCache[igdbGameId] = { likes_count: newCount, user_has_liked: !wasLiked };

        try {
            const res = await axios.post(`/games/likes/${igdbGameId}`, {
                game_name: gameName,
                cover_url: coverUrl,
            });
            // sync with server truth
            setLiked(res.data.liked);
            setLikesCount(res.data.likes_count);
            likesCache[igdbGameId] = { likes_count: res.data.likes_count, user_has_liked: res.data.liked };
        } catch (err) {
            // Revert on failure
            setLiked(wasLiked);
            setLikesCount(wasLiked ? newCount + 1 : newCount - 1);
            likesCache[igdbGameId] = { likes_count: wasLiked ? newCount + 1 : newCount - 1, user_has_liked: wasLiked };
        } finally {
            setToggling(false);
        }
    }, [igdbGameId, isAuthenticated, liked, toggling, likesCount]);

    return { liked, likesCount, loading, toggling, toggleLike };
};
