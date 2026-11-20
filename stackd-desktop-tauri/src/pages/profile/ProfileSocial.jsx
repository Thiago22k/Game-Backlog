import { useEffect, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useFollow } from '../../hooks/useFollow';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../utils/avatar';

const UserCard = ({ user, currentUser, onToggleFollow }) => (
    <div className="bg-primary-navy-dark rounded-xl p-4 flex items-center justify-between shadow-md border border-transparent hover:border-primary-yellow/30 transition-colors">
        <Link to={`/profile/${user.username}`} className="flex items-center gap-4 flex-1">
            <img
                src={getAvatarUrl({ avatar_url: user.avatar_url, avatar_static_url: user.avatar_static_url }, { animated: false })}
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover border border-gray-700"
            />
            <div className="min-w-0">
                <div className="text-white font-bold hover:text-primary-yellow transition-colors truncate" title={user.username}>
                    {user.username}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                    Followed on {new Date(user.followed_at).toLocaleDateString()}
                </div>
            </div>
        </Link>
        {currentUser && currentUser.username !== user.username && (
            <button
                onClick={() => onToggleFollow(user)}
                className={`ml-2 sm:ml-4 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${user.is_following_by_me
                    ? 'bg-black/40 hover:bg-black/60 text-white border-gray-600'
                    : 'bg-primary-yellow hover:bg-white text-primary-navy-dark border-primary-yellow/50'
                    }`}
            >
                {user.is_following_by_me ? 'Unfollow' : 'Follow'}
            </button>
        )}
    </div>
);

const ProfileSocial = () => {
    const { username } = useParams();
    const { isOwner } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { getProfileSocialData, followUser, unfollowUser } = useFollow();

    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [counts, setCounts] = useState({ followers: 0, following: 0 });
    const [activeTab, setActiveTab] = useState('followers');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSocialData = async () => {
            if (username) {
                setIsLoading(true);
                const data = await getProfileSocialData(username);
                if (data) {
                    setFollowers(data.followers || []);
                    setFollowing(data.following || []);
                    setCounts(data.counts || { followers: 0, following: 0 });
                }
                setIsLoading(false);
            }
        };
        fetchSocialData();
    }, [username, getProfileSocialData, currentUser]); // Refetch if logged in user changes so flags update

    const handleToggleCardFollow = async (targetUser) => {
        const isFollowing = targetUser.is_following_by_me;
        const targetId = targetUser.id;

        // Optimistic UI Update
        const updateList = (list) => list.map(u =>
            u.id === targetId ? { ...u, is_following_by_me: !isFollowing } : u
        );

        setFollowers(updateList(followers));
        setFollowing(updateList(following));

        try {
            if (isFollowing) {
                await unfollowUser(targetId);
            } else {
                await followUser(targetId);
            }
        } catch (error) {
            // Revert on error
            setFollowers(updateList(followers)); // Inverts again back to original
            setFollowing(updateList(following));
            console.error('Error toggling follow:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Users className="animate-pulse text-gray-600 w-12 h-12" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Toggles */}
            <div className="flex space-x-2 p-1 bg-primary-navy-dark rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('followers')}
                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-all
                        ${activeTab === 'followers'
                            ? 'bg-primary-navy text-primary-yellow shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                    `}
                >
                    Followers <span className="ml-1 opacity-70">({counts.followers})</span>
                </button>
                <button
                    onClick={() => setActiveTab('following')}
                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-all
                        ${activeTab === 'following'
                            ? 'bg-primary-navy text-primary-yellow shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                    `}
                >
                    Following <span className="ml-1 opacity-70">({counts.following})</span>
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {activeTab === 'followers' ? (
                    followers.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-gray-400 bg-primary-navy-dark rounded-xl">
                            {isOwner
                                ? "You don't have any followers yet."
                                : `${username} has no followers yet.`}
                        </div>
                    ) : (
                        followers.map(user => <UserCard key={user.id} user={user} currentUser={currentUser} onToggleFollow={handleToggleCardFollow} />)
                    )
                ) : (
                    following.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-gray-400 bg-primary-navy-dark rounded-xl">
                            {isOwner
                                ? "You aren't following anyone yet."
                                : `${username} is not following anyone yet.`}
                        </div>
                    ) : (
                        following.map(user => <UserCard key={user.id} user={user} currentUser={currentUser} onToggleFollow={handleToggleCardFollow} />)
                    )
                )}
            </div>
        </div>
    );
};

export default ProfileSocial;
