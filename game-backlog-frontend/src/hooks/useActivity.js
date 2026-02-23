import { useState, useCallback } from 'react';
import axios from '../api/axios';

export const useActivity = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isProfilePublic, setIsProfilePublic] = useState(true);

    const getUserActivity = useCallback(async (username, limit = 20) => {
        setLoading(true);
        setError(null);
        try {
            // Use the generic /api/activity/users endpoint we mounted
            const response = await axios.get(`/activity/users/${username}?limit=${limit}`);
            setActivities(response.data.activities || []);

            if (response.data.is_profile_public !== undefined) {
                setIsProfilePublic(response.data.is_profile_public);
            }

            return { success: true, data: response.data.activities };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error loading activity feed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        activities,
        loading,
        error,
        isProfilePublic,
        getUserActivity
    };
};
