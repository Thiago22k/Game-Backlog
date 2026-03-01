import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL = 30_000; // 30 seconds

export const useNotifications = () => {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setLoading(true);
            const res = await axios.get('/notifications');
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            // Silently fail — don't disrupt the UI
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        // Fetch inmediamente al montar
        fetchNotifications();

        // Intervalo que solo dispara si la tab es visible
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
            }
        }, POLL_INTERVAL);

        // Disparar fetch si la pestaña vuelve a ser visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAuthenticated, fetchNotifications]);

    const markAllRead = useCallback(async () => {
        try {
            await axios.put('/notifications/read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {/* silent */ }
    }, []);

    const markOneRead = useCallback(async (id) => {
        try {
            await axios.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {/* silent */ }
    }, []);

    return { notifications, unreadCount, loading, fetchNotifications, markAllRead, markOneRead };
};
