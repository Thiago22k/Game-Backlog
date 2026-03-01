import { useState, useCallback } from 'react';
import axios from '../api/axios';

export const useFollow = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const followUser = useCallback(async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`/follows/${userId}`);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.error || 'Error following user');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const unfollowUser = useCallback(async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.delete(`/follows/${userId}`);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.error || 'Error unfollowing user');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const checkFollowStatus = useCallback(async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/follows/${userId}/status`);
            return response.data.isFollowing;
        } catch (err) {
            setError(err.response?.data?.error || 'Error checking follow status');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const getProfileSocialData = useCallback(async (username) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/users/${username}/social`);
            return response.data; // { followers: [], following: [], counts: {} }
        } catch (err) {
            setError(err.response?.data?.error || 'Error fetching social data');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        followUser,
        unfollowUser,
        checkFollowStatus,
        getProfileSocialData,
        loading,
        error
    };
};
