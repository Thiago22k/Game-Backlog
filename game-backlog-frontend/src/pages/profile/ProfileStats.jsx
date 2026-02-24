import { useOutletContext, useParams } from 'react-router-dom';
import { Gamepad2, Trophy, Star, Clock, XCircle, Archive } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-primary-navy-dark rounded-xl p-6 flex items-center justify-between">
        <div>
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10 ${colorClass}`}>
            <Icon className={colorClass.replace('bg-', 'text-')} size={24} />
        </div>
    </div>
);

// Read-only half-star mini display
const MiniStars = ({ rating }) => {
    const value = Number(rating) || 0;
    return (
        <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map(star => {
                const fill = value >= star ? 'full' : value >= star - 0.5 ? 'half' : 'empty';
                return (
                    <span key={star} className="relative inline-block w-4 h-4">
                        <Star size={16} className="absolute inset-0" style={{ color: '#374151', fill: '#374151' }} />
                        {fill !== 'empty' && (
                            <span
                                className="absolute inset-0 overflow-hidden"
                                style={{ clipPath: fill === 'half' ? 'inset(0 50% 0 0)' : 'none' }}
                            >
                                <Star size={16} style={{ color: '#EAB308', fill: '#EAB308' }} />
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
};

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
        ? (ratedGames.reduce((sum, g) => sum + Number(g.rating), 0) / ratedGames.length).toFixed(1)
        : 0;

    // Rating distribution: count games per half-step value (0.5 … 5.0)
    const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    const ratingDistribution = STEPS.map(step => ({
        value: step,
        count: games.filter(g => Number(g.rating) === step).length,
    }));
    const maxRatingCount = Math.max(...ratingDistribution.map(r => r.count), 1);

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
                    value={Number(avgRating) > 0 ? avgRating : '—'}
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
                {/* Status Breakdown */}
                <div className="bg-primary-navy-dark rounded-xl p-6">
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

                {/* Rating Distribution */}
                <div className="bg-primary-navy-dark rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Rating Distribution</h4>
                    {ratedGames.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-6">No ratings yet</p>
                    ) : (
                        <div className="space-y-2">
                            {[...ratingDistribution].reverse().map(({ value, count }) => {
                                const pct = Math.round((count / maxRatingCount) * 100);
                                const isHalf = value % 1 !== 0;
                                const fullStars = Math.floor(value);
                                return (
                                    <div key={value} className="flex items-center gap-3">
                                        {/* Star label: full stars + optional half */}
                                        <div className="flex items-center gap-0.5 w-24 shrink-0">
                                            {Array.from({ length: fullStars }).map((_, i) => (
                                                <Star key={i} size={10} className="fill-primary-yellow text-primary-yellow" />
                                            ))}
                                            {isHalf && (
                                                <span className="relative inline-block w-[10px] h-[10px]">
                                                    <Star size={10} className="absolute inset-0 fill-gray-600 text-gray-600" />
                                                    <span className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(0 50% 0 0)' }}>
                                                        <Star size={10} className="fill-primary-yellow text-primary-yellow" />
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                        {/* Bar */}
                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary-yellow transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        {/* Count */}
                                        <span className="text-gray-400 text-xs w-4 text-right shrink-0">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {ratedGames.length > 0 && (
                        <p className="text-gray-500 text-xs mt-4 text-right">
                            {ratedGames.length} rated game{ratedGames.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileStats;
