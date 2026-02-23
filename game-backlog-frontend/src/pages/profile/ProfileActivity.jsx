import React, { useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useActivity } from '../../hooks/useActivity';
import ActivityFeed from '../../components/profile/ActivityFeed';

const ProfileActivity = () => {
    const { username } = useParams();
    const { activities, loading, getUserActivity } = useActivity();

    useEffect(() => {
        if (username) {
            getUserActivity(username);
        }
    }, [username, getUserActivity]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">
                Recent Activity
            </h3>

            <ActivityFeed
                activities={activities}
                username={username}
                loading={loading}
            />
        </div>
    );
};

export default ProfileActivity;
