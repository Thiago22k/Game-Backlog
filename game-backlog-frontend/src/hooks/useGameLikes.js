import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';

export const useGameLikes = (igdbGameId) => {
    const { isAuthenticated } = useAuth();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    // Fetch initial like status
    useEffect(() => {
        if (!igdbGameId) return;
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`/games/likes/${igdbGameId}`);
                setLiked(res.data.user_has_liked);
                setLikesCount(res.data.likes_count);
            } catch (err) {
                // silently fail – likes are non-critical
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, [igdbGameId]);

    // Toggle like
    const toggleLike = useCallback(async (gameName, coverUrl) => {
        if (!isAuthenticated || toggling) return;
        setToggling(true);
        // Optimistic update
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

        try {
            const res = await axios.post(`/games/likes/${igdbGameId}`, {
                game_name: gameName,
                cover_url: coverUrl,
            });
            // sync with server truth
            setLiked(res.data.liked);
            setLikesCount(res.data.likes_count);
        } catch (err) {
            // Revert on failure
            setLiked(wasLiked);
            setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
        } finally {
            setToggling(false);
        }
    }, [igdbGameId, isAuthenticated, liked, toggling]);

    return { liked, likesCount, loading, toggling, toggleLike };
};
