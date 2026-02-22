import { useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { Trophy, Star, LayoutDashboard, Gamepad2, Library, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGames } from '../../hooks/useGames';
import Navbar from '../../components/layout/Navbar';

const ProfileLayout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { username } = useParams();
    const location = useLocation();
    const gamesHook = useGames();
    const { games, getUserGames } = gamesHook;

    const isOwner = user?.username === username;

    useEffect(() => {
        if (username) {
            getUserGames(username);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    // Calcular estadísticas globales
    const stats = useMemo(() => {
        const ratedGames = games.filter(g => g.rating);
        return {
            total: games.length,
            completed: games.filter(g => g.status === 'completed').length,
            avgRating: ratedGames.length > 0
                ? (ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length).toFixed(1)
                : 0,
        };
    }, [games]);

    const tabs = [
        { name: 'Stats', path: `/profile/${username}`, icon: LayoutDashboard },
        { name: 'Games', path: `/profile/${username}/games`, icon: Gamepad2 },
        { name: 'Collections', path: `/profile/${username}/collections`, icon: Library },
    ];

    const currentPath = location.pathname;

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Header con Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            {isOwner ? `Welcome back, ${user?.username}` : `${username}'s Profile`}
                        </h2>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-400">
                                {stats.total} game{stats.total !== 1 ? 's' : ''}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="flex items-center gap-1 text-green-400">
                                <Trophy size={14} />
                                {stats.completed} completed
                            </span>
                            {stats.avgRating > 0 && (
                                <>
                                    <span className="text-gray-600">•</span>
                                    <span className="flex items-center gap-1 text-primary-yellow">
                                        <Star size={14} fill="currentColor" />
                                        {stats.avgRating} avg
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => navigate('/settings')}
                            className="px-6 py-2 bg-primary-yellow text-primary-navy-dark rounded-lg hover:opacity-90 font-semibold transition-all"
                        >
                            Settings
                        </button>
                    )}
                </div>

                {(!isOwner && !gamesHook.isProfilePublic) ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-primary-navy-dark rounded-xl border border-gray-700 shadow-lg relative overflow-hidden mt-8">
                        {/* Decorative background circle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

                        <div className="relative p-5 bg-gray-800/50 rounded-full mb-6 border border-gray-700 shadow-inner">
                            <Lock className="text-purple-400" size={56} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-3 tracking-wide">Private Profile</h3>
                        <p className="text-gray-400 max-w-md text-center leading-relaxed">
                            {username} has chosen to keep their profile private.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Tab Navigation */}
                        <div className="border-b border-gray-700 mb-8">
                            <nav className="-mb-px flex space-x-8">
                                {tabs.map((tab) => {
                                    // Comprobar active exacto para stats ('/profile/username') y parcial para otros
                                    const isActive =
                                        tab.path === `/profile/${username}`
                                            ? currentPath === tab.path
                                            : currentPath.startsWith(tab.path);

                                    const Icon = tab.icon;

                                    return (
                                        <Link
                                            key={tab.name}
                                            to={tab.path}
                                            className={`
                            flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${isActive
                                                    ? 'border-primary-yellow text-primary-yellow'
                                                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                                }
                        `}
                                        >
                                            <Icon className="mr-2" size={18} />
                                            {tab.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Pasamos el hook entero y el estado isOwner usando context */}
                        <Outlet context={{ ...gamesHook, isOwner }} />
                    </>
                )}
            </main>
        </div>
    );
};

export default ProfileLayout;
