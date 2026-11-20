import { useEffect, useState, useMemo } from 'react';
import { useOutletContext, useParams, Link } from 'react-router-dom';
import { Gamepad2, Trophy, Star, Clock, XCircle, Archive, Library, Heart, MessageSquare, ChevronRight, Sparkles } from 'lucide-react';
import { ENDPOINTS } from '../../utils/constants';
import SteamIcon from '../../assets/steam-icon.svg?react';
import axios from '../../api/axios';
import { getGameCover } from '../../utils/formatters';

const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    if (diffInHours < 48) return 'Yesterday';

    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const ProfileStats = () => {
    const { games, collections, loading, isOwner } = useOutletContext();
    const { username } = useParams();
    const [likesCount, setLikesCount] = useState(0);
    const [reviewsCount, setReviewsCount] = useState(0);
    const [steamAchievements, setSteamAchievements] = useState(null);

    useEffect(() => {
        if (!username) return;
        const fetchLikesAndReviews = async () => {
            try {
                const [likesRes, reviewsRes, steamAchRes] = await Promise.all([
                    axios.get(`/games/likes/by-username/${username}`),
                    axios.get(`/reviews/user/${username}/count`),
                    axios.get(ENDPOINTS.STEAM.USER_ACHIEVEMENTS_SUMMARY(username)).catch(() => ({ data: null })),
                ]);
                setLikesCount(likesRes.data.games?.length || 0);
                setReviewsCount(reviewsRes.data.count || 0);
                setSteamAchievements(steamAchRes.data);
            } catch (err) {
                console.error('Error fetching stats:', err);
            }
        };
        fetchLikesAndReviews();
    }, [username]);

    // Latest Completed Game
    const latestCompletedGame = useMemo(() => {
        const completedGames = games.filter(g => g.status === 'completed');
        if (completedGames.length === 0) return null;
        return [...completedGames].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    }, [games]);

    // Latest Playing Games (up to 2)
    const latestPlayingGames = useMemo(() => {
        const playingGames = games.filter(g => g.status === 'playing');
        return [...playingGames]
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 2);
    }, [games]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-yellow"></div>
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
        : '0.0';

    // Rating distribution (0.5–5.0 with half-point increments)
    const ratingDistribution = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(star => ({
        value: star,
        count: games.filter(g => Number(g.rating) === star).length,
    }));
    const maxRatingCount = Math.max(...ratingDistribution.map(r => r.count), 1);

    // Star display helper
    const renderStars = (rating) => {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5;
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
    };

    return (
        <div className="space-y-6">
            <h3 className="text-3xl font-black text-white tracking-tight">
                {isOwner ? 'Your Library Stats' : `${username}'s Library Stats`}
            </h3>

            {/* ── MAIN STATS GRID (mirrors stats.html layout) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">

                {/* ── ROW 1: Mini stat cards ── */}
                <Link
                    to={`/profile/${username}/games`}
                    className="bg-primary-navy-dark rounded-2xl p-5 flex flex-col justify-center hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group min-w-0"
                >
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1.5 group-hover:text-primary-yellow transition-colors truncate">Total Games</span>
                    <span className="text-4xl font-black text-white truncate">{games.length}</span>
                </Link>

                <Link
                    to={`/profile/${username}/collections`}
                    className="bg-primary-navy-dark rounded-2xl p-5 flex flex-col justify-center hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group min-w-0"
                >
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1.5 group-hover:text-primary-yellow transition-colors truncate">Collections</span>
                    <span className="text-4xl font-black text-white truncate">{collections?.length || 0}</span>
                </Link>

                <Link
                    to={`/profile/${username}/likes/games`}
                    className="bg-primary-navy-dark rounded-2xl p-5 flex flex-col justify-center hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group min-w-0"
                >
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1.5 group-hover:text-primary-yellow transition-colors truncate">Liked Games</span>
                    <span className="text-4xl font-black text-white truncate">{likesCount}</span>
                </Link>

                <Link
                    to={`/profile/${username}/reviews`}
                    className="bg-primary-navy-dark rounded-2xl p-5 flex flex-col justify-center hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group min-w-0"
                >
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1.5 group-hover:text-primary-yellow transition-colors truncate">Reviews</span>
                    <span className="text-4xl font-black text-white truncate">{reviewsCount}</span>
                </Link>

                {/* ── ROW 2: Library Progress (span 2) ── */}
                <div className="col-span-2 bg-primary-navy-dark rounded-2xl p-6 flex flex-col justify-between min-w-0">
                    <h4 className="text-base font-bold text-white mb-5">Library Progress</h4>

                    {/* Completed + Backlog highlights */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <Link
                            to={`/profile/${username}/games?status=completed`}
                            className="bg-primary-navy rounded-xl p-4 flex flex-col hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group"
                        >
                            <span className="text-3xl font-black text-green-400 leading-none">{completed}</span>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1 group-hover:text-green-400 transition-colors">Completed</span>
                        </Link>
                        <Link
                            to={`/profile/${username}/games?status=backlog`}
                            className="bg-primary-navy rounded-xl p-4 flex flex-col hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group"
                        >
                            <span className="text-3xl font-black text-indigo-400 leading-none">{backlog}</span>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1 group-hover:text-indigo-400 transition-colors">Backlog</span>
                        </Link>
                    </div>

                    {/* Secondary stats row */}
                    <div className="flex flex-wrap justify-between items-center bg-primary-navy rounded-xl px-4 py-3 gap-2">
                        <Link
                            to={`/profile/${username}/games?status=playing`}
                            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-blue-400 transition-colors group"
                        >
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 group-hover:scale-125 transition-transform" />
                            Playing: <span className="text-white font-black">{playing}</span>
                        </Link>
                        <Link
                            to={`/profile/${username}/games?status=wishlist`}
                            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-pink-400 transition-colors group"
                        >
                            <span className="w-2 h-2 rounded-full bg-pink-400 shrink-0 group-hover:scale-125 transition-transform" />
                            Wishlist: <span className="text-white font-black">{wishlist}</span>
                        </Link>
                        <Link
                            to={`/profile/${username}/games?status=dropped`}
                            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-red-400 transition-colors group"
                        >
                            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 group-hover:scale-125 transition-transform" />
                            Dropped: <span className="text-white font-black">{dropped}</span>
                        </Link>
                    </div>
                </div>

                {/* ── ROW 2: Rating Distribution (span 2) ── */}
                <div className="col-span-2 bg-primary-navy-dark rounded-2xl p-4 sm:p-6 min-w-0 w-full">
                    <h4 className="text-base font-bold text-white mb-5">Rating Distribution</h4>

                    {ratedGames.length > 0 ? (
                        <div className="flex gap-4 sm:gap-6 items-center">
                            {/* Score summary */}
                            <div className="flex flex-col items-center shrink-0">
                                <span className="text-5xl font-black text-white leading-none">{avgRating}</span>
                                <span className="text-amber-400 text-xl tracking-widest my-2">{renderStars(parseFloat(avgRating))}</span>
                                <span className="text-xs text-gray-400 font-semibold">{ratedGames.length} games rated</span>
                            </div>

                            {/* Vertical bars */}
                            <div className="flex-1 w-full flex items-end gap-1 sm:gap-1.5 h-32 pt-2 min-w-0">
                                {[...ratingDistribution].reverse().map(({ value, count }) => {
                                    const percentage = ratedGames.length > 0 ? ((count / ratedGames.length) * 100).toFixed(1) : 0;
                                    return (
                                        <Link
                                            key={value}
                                            to={`/profile/${username}/games?rating=${value}`}
                                            className="flex-1 flex flex-col items-center gap-2 group h-full cursor-pointer"
                                        >
                                            <div className="flex-1 w-full bg-primary-navy-light rounded-t-sm flex items-end relative">
                                                <div
                                                    className="w-full bg-amber-400 rounded-t-sm transition-all duration-500 group-hover:bg-amber-300 group-hover:scale-x-110"
                                                    style={{ height: `${(count / maxRatingCount) * 100}%` }}
                                                />
                                                {/* Custom Tooltip (Estilo Mini / Escala Original) */}
                                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 translate-y-1 group-hover:translate-y-0 flex flex-col items-center">

                                                    {/* Cuerpo del Tooltip (Escala Mini) */}
                                                    <div className="bg-primary-navy-dark border border-white/10 shadow-2xl px-2.5 py-1 rounded-md whitespace-nowrap relative z-10">
                                                        <span className="text-[11px] font-semibold text-white tracking-wide">
                                                            {value} <span className="text-gray-500 mx-1">|</span> {count} {count === 1 ? 'game' : 'games'} <span className="text-amber-400 ml-0.5">({percentage}%)</span>
                                                        </span>
                                                    </div>

                                                    {/* El Rombo (Diamante Completo Sobresaliente) */}
                                                    <div className="w-2.5 h-2.5 bg-white rotate-45 -mt-0.5 shadow-lg relative z-0" />

                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 transition-colors group-hover:text-gray-300">{value}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-24 border-2 border-dashed border-white/5 rounded-xl">
                            <p className="text-gray-600 text-xs font-black italic uppercase tracking-widest">No ratings yet</p>
                        </div>
                    )}
                </div>

                {/* ── ROW 3: Featured Games Row ── */}
                <div className="col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-4 lg:gap-5 min-w-0">

                    {/* Last Completed Game (span 4/10 = 40%) */}
                    <Link
                        to={latestCompletedGame ? `/game/${latestCompletedGame.game_details?.slug || latestCompletedGame.igdb_game_id}` : '#'}
                        className={`lg:col-span-4 bg-primary-navy-dark rounded-2xl p-5 flex items-center gap-5 hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group relative ${!latestCompletedGame ? 'pointer-events-none' : ''}`}
                    >
                        {latestCompletedGame ? (
                            <>
                                <div className="shrink-0 w-20 h-28 rounded-xl overflow-hidden border border-white/10 shadow-xl" title={latestCompletedGame.game_details?.name}>
                                    <img
                                        src={getGameCover(latestCompletedGame.game_details, 't_cover_big')}
                                        alt={latestCompletedGame.game_details?.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                </div>

                                {/* Dynamic Completion Time Badge - Featured Corner */}
                                <div className="absolute top-4 right-5">
                                    <span className="bg-black/20 text-gray-400 text-xs font-black px-3 py-1 rounded-full shadow-sm whitespace-nowrap uppercase tracking-widest">
                                        {formatRelativeTime(latestCompletedGame.updated_at)}
                                    </span>
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className="text-green-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Last Completed</span>
                                    <h5 className="text-xl font-black text-white group-hover:text-primary-yellow transition-colors truncate" title={latestCompletedGame.game_details?.name}>
                                        {latestCompletedGame.game_details?.name}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-1.5 text-gray-400 text-xs">
                                        {latestCompletedGame.rating && (
                                            <span className="flex items-center gap-1">
                                                <Star size={10} className="text-primary-yellow fill-primary-yellow" />
                                                <span className="font-extrabold text-gray-200">{Number(latestCompletedGame.rating).toFixed(1)}</span>
                                            </span>
                                        )}
                                        <span>
                                            {new Date(latestCompletedGame.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-4 w-full py-2">
                                <div className="shrink-0 w-20 h-28 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center">
                                    <Trophy size={28} className="text-gray-800" />
                                </div>
                                <p className="text-gray-600 font-black italic uppercase tracking-widest text-xs">No completions yet</p>
                            </div>
                        )}
                    </Link>

                    {[0, 1].map((index) => {
                        const game = latestPlayingGames[index];
                        return (
                            <Link
                                key={index}
                                to={game ? `/game/${game.game_details?.slug || game.igdb_game_id}` : '#'}
                                className={`lg:col-span-3 bg-primary-navy-dark rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group ${!game ? 'pointer-events-none' : ''}`}
                            >
                                {game ? (
                                    <>
                                        <div className="shrink-0 w-20 h-28 rounded-xl overflow-hidden border border-white/10 shadow-xl" title={game.game_details?.name}>
                                            <img
                                                src={getGameCover(game.game_details, 't_cover_big')}
                                                alt={game.game_details?.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Playing</span>
                                            </div>
                                            <h5 className="text-xl font-black text-white group-hover:text-primary-yellow transition-colors truncate" title={game.game_details?.name}>
                                                {game.game_details?.name}
                                            </h5>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4 w-full py-1 opacity-40">
                                        <div className="shrink-0 w-20 h-28 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center">
                                            <Clock size={24} className="text-gray-600" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] leading-tight">Slot<br />Available</span>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
                {/* ── ROW 4: Steam Achievements Showcase (si tiene logros cacheados) ── */}
                {steamAchievements?.linked && steamAchievements.total_unlocked > 0 && (
                    <div className="col-span-2 lg:col-span-4 bg-primary-navy-dark rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[#00adee]/15">
                                    <SteamIcon className="w-5 h-5 fill-[#00adee]" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-white">Steam Achievements</h4>
                                    <p className="text-xs text-gray-400">
                                        {steamAchievements.total_unlocked} unlocked across {steamAchievements.games_with_achievements} game{steamAchievements.games_with_achievements === 1 ? '' : 's'}
                                        {steamAchievements.rare_unlocked > 0 && (
                                            <span className="text-amber-400 font-semibold ml-2">
                                                • {steamAchievements.rare_unlocked} rare (≤10%)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {steamAchievements.rarest_achievements?.length > 0 && (
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
                                    Rarest Unlocked
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {steamAchievements.rarest_achievements.map((ach) => (
                                        <Link
                                            key={`${ach.steam_appid}-${ach.api_name}`}
                                            to={ach.igdb_game_id ? `/game/${ach.game_slug || ach.igdb_game_id}` : '#'}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-primary-navy hover:bg-primary-navy-light hover:-translate-y-1 transition-all duration-200 group transition-colors min-w-0"
                                        >
                                            {ach.icon_url ? (
                                                <img
                                                    src={ach.icon_url}
                                                    alt={ach.display_name}
                                                    className="w-11 h-11 rounded-lg object-cover shrink-0 ring-1 ring-amber-400/40"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 rounded-lg bg-primary-navy-dark flex items-center justify-center shrink-0">
                                                    <Trophy size={18} className="text-amber-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-white truncate" title={ach.display_name}>
                                                    {ach.display_name}
                                                </p>
                                                <p className="text-[11px] text-gray-400 truncate" title={ach.game_name}>
                                                    {ach.game_name || 'Steam Game'}
                                                </p>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 mt-0.5">
                                                    <Sparkles size={10} /> {ach.global_percent}% of players
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileStats;