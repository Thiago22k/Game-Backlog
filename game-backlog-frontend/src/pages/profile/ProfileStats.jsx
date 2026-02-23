import { useOutletContext, useParams } from 'react-router-dom';
import { Gamepad2, Trophy, Star, Clock, XCircle, Archive } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-primary-navy-dark border border-gray-700 rounded-xl p-6 flex items-center justify-between">
        <div>
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10 ${colorClass}`}>
            <Icon className={colorClass.replace('bg-', 'text-')} size={24} />
        </div>
    </div>
);

const ProfileStats = () => {
    const { games, loading, isOwner } = useOutletContext();
    const { username } = useParams();

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow"></div>
            </div>
        );
    }

    const completed = games.filter(g => g.status === 'completed').length;
    const playing = games.filter(g => g.status === 'playing').length;
    const dropped = games.filter(g => g.status === 'dropped').length;
    const wishlist = games.filter(g => g.status === 'wishlist').length;
    const backlog = games.filter(g => g.status === 'backlog').length;
    const ratedGames = games.filter(g => g.rating);
    const avgRating = ratedGames.length > 0
        ? (ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length).toFixed(1)
        : 0;

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">
                {isOwner ? 'Your Library Stats' : `${username}'s Library Stats`}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Games"
                    value={games.length}
                    icon={Gamepad2}
                    colorClass="bg-blue-400 text-blue-400"
                />
                <StatCard
                    title="Completed"
                    value={completed}
                    icon={Trophy}
                    colorClass="bg-green-400 text-green-400"
                />
                <StatCard
                    title="Average Rating"
                    value={avgRating}
                    icon={Star}
                    colorClass="bg-primary-yellow text-primary-yellow"
                />
                <StatCard
                    title="Wishlisted"
                    value={wishlist}
                    icon={Clock}
                    colorClass="bg-purple-400 text-purple-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-primary-navy-dark border border-gray-700 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Status Breakdown</h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-gray-300">
                                <Trophy size={18} className="text-green-400 mr-2" />
                                <span>Completed</span>
                            </div>
                            <span className="font-semibold text-white">{completed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-gray-300">
                                <Gamepad2 size={18} className="text-blue-400 mr-2" />
                                <span>Playing</span>
                            </div>
                            <span className="font-semibold text-white">{playing}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-gray-300">
                                <Clock size={18} className="text-purple-400 mr-2" />
                                <span>Wishlist</span>
                            </div>
                            <span className="font-semibold text-white">{wishlist}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-gray-300">
                                <Archive size={18} className="text-purple-400 mr-2" />
                                <span>Backlog</span>
                            </div>
                            <span className="font-semibold text-white">{backlog}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-gray-300">
                                <XCircle size={18} className="text-red-400 mr-2" />
                                <span>Dropped</span>
                            </div>
                            <span className="font-semibold text-white">{dropped}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileStats;
