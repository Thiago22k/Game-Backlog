import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, RefreshCw, Search, Eye, Sparkles, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import SteamIcon from '../../assets/steam-icon.svg?react';

const formatUnlockDate = (isoDate) => {
    if (!isoDate) return null;
    try {
        return new Date(isoDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return null;
    }
};

const SteamAchievementsTab = ({ gameId, onLoaded }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all' | 'unlocked' | 'locked' | 'rare'
    const [search, setSearch] = useState('');
    const [revealedSpoilers, setRevealedSpoilers] = useState({});

    const fetchAchievements = useCallback(
        async (forceRefresh = false) => {
            if (!gameId) return;
            if (forceRefresh) setRefreshing(true);
            else setLoading(true);

            try {
                const url = forceRefresh
                    ? `${ENDPOINTS.STEAM.GAME_ACHIEVEMENTS(gameId)}?refresh=1`
                    : ENDPOINTS.STEAM.GAME_ACHIEVEMENTS(gameId);
                const res = await axios.get(url);
                setData(res.data);
                if (onLoaded) onLoaded(res.data);
                if (forceRefresh) toast.success('Achievements refreshed');
            } catch {
                toast.error('Could not load Steam achievements');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [gameId, onLoaded]
    );

    useEffect(() => {
        fetchAchievements(false);
    }, [fetchAchievements]);

    const filteredAchievements = useMemo(() => {
        const list = data?.achievements || [];
        const q = search.trim().toLowerCase();

        return list.filter((ach) => {
            if (filter === 'unlocked' && !ach.unlocked) return false;
            if (filter === 'locked' && ach.unlocked) return false;
            if (filter === 'rare' && !ach.is_rare) return false;

            if (!q) return true;
            const isHiddenLocked = ach.hidden && !ach.unlocked && !revealedSpoilers[ach.api_name];
            if (isHiddenLocked) {
                return ach.display_name?.toLowerCase().includes(q);
            }
            return (
                ach.display_name?.toLowerCase().includes(q) ||
                ach.description?.toLowerCase().includes(q)
            );
        });
    }, [data, filter, search, revealedSpoilers]);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="bg-primary-navy-dark rounded-2xl h-28" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="bg-primary-navy-dark rounded-xl h-20" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data?.supported) {
        return (
            <div className="bg-primary-navy-dark rounded-2xl p-12 text-center border border-dashed border-gray-700">
                <Trophy size={44} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-300 font-medium mb-1">No Steam achievements available</p>
                <p className="text-xs text-gray-500">
                    This game does not have Steam achievement data mapped yet.
                </p>
            </div>
        );
    }

    const { summary, user_linked, user_synced } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Progress Summary */}
            <div className="bg-primary-navy-dark rounded-2xl p-6 border border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#00adee]/15">
                            <SteamIcon className="w-6 h-6 fill-[#00adee]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Steam Achievements
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                    {summary.total}
                                </span>
                            </h3>
                            <p className="text-xs text-gray-400">
                                {user_synced
                                    ? `You have unlocked ${summary.unlocked} of ${summary.total} achievements (${summary.percent}%)`
                                    : user_linked
                                        ? 'Make sure your Steam Game Details are set to Public to track personal progress'
                                        : 'Global Steam achievement list and rarity'}
                            </p>
                        </div>
                    </div>

                    {user_linked && (
                        <button
                            type="button"
                            onClick={() => fetchAchievements(true)}
                            disabled={refreshing}
                            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    )}
                </div>

                {user_synced && (
                    <div className="mt-5 space-y-2">
                        <div className="w-full h-2.5 bg-primary-navy rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#00adee] to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${summary.percent}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{summary.percent}% Completed</span>
                            {summary.rare_total > 0 && (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                                    <Sparkles size={12} />
                                    {summary.rare_unlocked}/{summary.rare_total} Rare (≤10%)
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {(user_synced
                        ? [
                            { id: 'all', label: `All (${summary.total})` },
                            { id: 'unlocked', label: `Unlocked (${summary.unlocked})` },
                            { id: 'locked', label: `Locked (${summary.total - summary.unlocked})` },
                            { id: 'rare', label: `Rare (${summary.rare_total})` },
                        ]
                        : [
                            { id: 'all', label: `All (${summary.total})` },
                            { id: 'rare', label: `Rare (${summary.rare_total})` },
                        ]
                    ).map((btn) => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => setFilter(btn.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === btn.id
                                    ? 'bg-primary-yellow text-primary-navy-dark'
                                    : 'bg-primary-navy-dark text-gray-400 hover:text-white'
                                }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                <div className="relative sm:w-64">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search achievements..."
                        className="w-full pl-9 pr-3 py-1.5 bg-primary-navy-dark border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-yellow"
                    />
                </div>
            </div>

            {/* Achievements Grid */}
            {filteredAchievements.length === 0 ? (
                <div className="bg-primary-navy-dark rounded-xl p-8 text-center text-sm text-gray-400">
                    No achievements match your current filter.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAchievements.map((ach) => {
                        const isHiddenLocked = ach.hidden && !ach.unlocked && !revealedSpoilers[ach.api_name];
                        const iconSrc = ach.unlocked ? ach.icon_url : ach.icon_gray_url || ach.icon_url;
                        const unlockDate = formatUnlockDate(ach.unlocked_at);

                        return (
                            <div
                                key={ach.api_name}
                                className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${ach.unlocked
                                        ? ach.is_rare
                                            ? 'bg-primary-navy-dark border-amber-400/40 shadow-sm shadow-amber-500/5'
                                            : 'bg-primary-navy-dark border-emerald-500/25'
                                        : 'bg-primary-navy-dark/70 border-white/5 opacity-80 hover:opacity-100'
                                    }`}
                            >
                                {/* Icon */}
                                <div
                                    className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-primary-navy ${ach.is_rare && ach.unlocked ? 'ring-2 ring-amber-400/70' : ''
                                        }`}
                                >
                                    {iconSrc ? (
                                        <img
                                            src={iconSrc}
                                            alt={ach.display_name}
                                            className={`w-full h-full object-cover ${!ach.unlocked ? 'grayscale opacity-75' : ''}`}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Trophy size={20} className="text-gray-600" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-bold text-white truncate" title={ach.display_name}>
                                            {ach.display_name}
                                        </p>
                                        {ach.global_percent !== null && (
                                            <span
                                                className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded ${ach.is_rare
                                                        ? 'bg-amber-400/15 text-amber-300'
                                                        : 'bg-white/5 text-gray-400'
                                                    }`}
                                                title="Percentage of Steam players who unlocked this"
                                            >
                                                {ach.global_percent}%
                                            </span>
                                        )}
                                    </div>

                                    {isHiddenLocked ? (
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 italic">
                                                <Lock size={11} /> Hidden achievement
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRevealedSpoilers((prev) => ({ ...prev, [ach.api_name]: true }))
                                                }
                                                className="inline-flex items-center gap-1 text-[11px] text-primary-yellow hover:underline"
                                            >
                                                <Eye size={11} /> Reveal
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                                            {ach.description || 'No description provided.'}
                                        </p>
                                    )}

                                    {ach.unlocked && unlockDate && (
                                        <p className="text-[11px] text-emerald-400/90 mt-1">
                                            Unlocked on {unlockDate}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SteamAchievementsTab;