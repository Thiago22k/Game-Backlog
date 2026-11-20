import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Astroid, Gem, Archive, Compass, SlidersHorizontal, RotateCcw, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import useSEO from '../hooks/useSEO';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import InteractiveGameCard from '../components/games/InteractiveGameCard';
import InteractiveGameCardSkeleton from '../components/games/InteractiveGameCardSkeleton';
import CustomSelect from '../components/common/CustomSelect';

const MODES = [
    {
        id: 'for_you',
        label: 'For You',
        description: 'Tailored to your ratings, completed titles, likes & Steam playtime',
        icon: Astroid,
        requiresAuth: false,
    },
    {
        id: 'hidden_gems',
        label: 'Hidden Gems',
        description: 'Critically acclaimed titles off the mainstream radar',
        icon: Gem,
        requiresAuth: false,
    },
    {
        id: 'backlog',
        label: 'From Your Backlog',
        description: 'Best picks to play next from games you already own',
        icon: Archive,
        requiresAuth: true,
    },
    {
        id: 'because_you_played',
        label: 'Similar to a Favorite',
        description: 'Deep-dive recommendations anchored to one of your games',
        icon: Compass,
        requiresAuth: true,
    },
];

const PLATFORM_OPTIONS = [
    { value: '', label: 'All Platforms' },
    { value: '6', label: 'PC (Windows)' },
    { value: '167', label: 'PlayStation 5' },
    { value: '48', label: 'PlayStation 4' },
    { value: '130', label: 'Nintendo Switch' },
    { value: '169', label: 'Xbox Series X|S' },
    { value: '49', label: 'Xbox One' },
];

const GAME_MODE_OPTIONS = [
    { value: '', label: 'Any Mode' },
    { value: '1', label: 'Single-player' },
    { value: '3', label: 'Co-operative' },
    { value: '2', label: 'Multiplayer' },
];

const MIN_YEAR_OPTIONS = [
    { value: '', label: 'Any Era' },
    { value: '2024', label: '2024 – Present' },
    { value: '2020', label: '2020 or newer' },
    { value: '2015', label: '2015 or newer' },
    { value: '2010', label: '2010 or newer' },
    { value: '2000', label: '2000 or newer' },
];

const MIN_RATING_OPTIONS = [
    { value: '', label: 'Default (72+)' },
    { value: '85', label: '85+ Acclaimed' },
    { value: '80', label: '80+ Great' },
    { value: '75', label: '75+ Solid' },
    { value: '65', label: '65+ Relaxed' },
];

const STATUS_LABELS = {
    completed: 'Completed',
    playing: 'Playing',
    wishlist: 'Wishlist',
    backlog: 'Backlog',
    dropped: 'Dropped',
};

const Recommendations = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { userGames, getUserGames, addGame, updateGame, deleteGame } = useGames();
    const [searchParams, setSearchParams] = useSearchParams();

    const [mode, setMode] = useState(searchParams.get('mode') || 'for_you');
    const [seedGameId, setSeedGameId] = useState(searchParams.get('seedGameId') || '');
    const [genreId, setGenreId] = useState(searchParams.get('genres') || '');
    const [excludeGenreId, setExcludeGenreId] = useState(searchParams.get('excludeGenres') || '');
    const [platformId, setPlatformId] = useState(searchParams.get('platforms') || '');
    const [gameModeId, setGameModeId] = useState(searchParams.get('gameModes') || '');
    const [minYear, setMinYear] = useState(searchParams.get('minYear') || '');
    const [minRating, setMinRating] = useState(searchParams.get('minRating') || '');

    const [availableGenres, setAvailableGenres] = useState([]);
    const [seedOptions, setSeedOptions] = useState([]);
    const [games, setGames] = useState([]);
    const [profileSummary, setProfileSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const userGamesRef = useRef([]);
    useEffect(() => {
        userGamesRef.current = isAuthenticated ? userGames : [];
    }, [userGames, isAuthenticated]);

    useSEO({
        title: isAuthenticated ? 'Recommended for You' : 'Discover Games',
        description: 'Personalized game recommendations tailored to your library, ratings, and Steam activity.',
    });

    // Si cierra sesión estando en un modo privado, volver a 'for_you'
    useEffect(() => {
        if (!isAuthenticated && (mode === 'backlog' || mode === 'because_you_played')) {
            setMode('for_you');
        }
    }, [isAuthenticated, mode]);

    // Cargar géneros y biblioteca del usuario (o limpiar si es visitante)
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                if (!isAuthenticated) {
                    userGamesRef.current = [];
                    setSeedOptions([]);
                    setSeedGameId('');
                    setProfileSummary(null);
                }

                const [genresRes, userGamesRes] = await Promise.all([
                    axios.get(ENDPOINTS.GAMES.GENRES),
                    isAuthenticated ? getUserGames() : Promise.resolve({ success: false, data: [] }),
                ]);

                const genresList = genresRes.data.genres || [];
                setAvailableGenres(genresList);

                if (isAuthenticated && userGamesRes.success && Array.isArray(userGamesRes.data)) {
                    userGamesRef.current = userGamesRes.data;
                    const seeds = [...userGamesRes.data]
                        .filter((g) => g.status !== 'dropped' && g.game_details?.name)
                        .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (b.playtime_minutes || 0) - (a.playtime_minutes || 0))
                        .slice(0, 40)
                        .map((g) => ({
                            value: String(g.igdb_game_id),
                            label: `${g.game_details.name}${g.rating ? ` (${g.rating}/5)` : ''}`,
                        }));
                    setSeedOptions(seeds);
                    if (!seedGameId && seeds.length > 0) {
                        setSeedGameId(seeds[0].value);
                    }
                }
            } catch (err) {
                console.error('Error loading recommendation metadata:', err);
            }
        };

        loadMetadata();
    }, [isAuthenticated]);

    // Sincronizar URL y ejecutar consulta al motor de recomendaciones
    useEffect(() => {
        const effectiveMode = !isAuthenticated && (mode === 'backlog' || mode === 'because_you_played')
            ? 'for_you'
            : mode;

        const params = new URLSearchParams();
        if (effectiveMode !== 'for_you') params.set('mode', effectiveMode);
        if (effectiveMode === 'because_you_played' && seedGameId) params.set('seedGameId', seedGameId);
        if (genreId) params.set('genres', genreId);
        if (excludeGenreId) params.set('excludeGenres', excludeGenreId);
        if (platformId) params.set('platforms', platformId);
        if (gameModeId) params.set('gameModes', gameModeId);
        if (minYear) params.set('minYear', minYear);
        if (minRating) params.set('minRating', minRating);
        setSearchParams(params, { replace: true });

        const fetchRecommendations = async () => {
            if (effectiveMode === 'because_you_played' && !seedGameId) {
                setGames([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const queryParams = { limit: 24, mode: effectiveMode };
                if (effectiveMode === 'because_you_played' && seedGameId) queryParams.seedGameId = seedGameId;
                if (genreId) queryParams.genres = genreId;
                if (excludeGenreId) queryParams.excludeGenres = excludeGenreId;
                if (platformId) queryParams.platforms = platformId;
                if (gameModeId) queryParams.gameModes = gameModeId;
                if (minYear) queryParams.minYear = minYear;
                if (minRating) queryParams.minRating = minRating;

                const res = await axios.get(ENDPOINTS.GAMES.RECOMMENDATIONS, { params: queryParams });
                const rawGames = res.data.games || [];
                setProfileSummary(isAuthenticated ? (res.data.profile_summary || null) : null);

                const merged = rawGames.map((g) => {
                    const existing = isAuthenticated
                        ? userGamesRef.current.find((ug) => ug.igdb_game_id === g.id)
                        : null;
                    return {
                        ...g,
                        status: existing?.status ?? null,
                        user_rating: existing?.rating ?? 0,
                    };
                });

                setGames(merged);
            } catch (err) {
                console.error('Error fetching filtered recommendations:', err);
                toast.error('Failed to load recommendations');
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [isAuthenticated, mode, seedGameId, genreId, excludeGenreId, platformId, gameModeId, minYear, minRating]);

    const handleStatusChange = useCallback(async (gameId, newStatus, currentRating = 0) => {
        const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);
        const validRating = currentRating >= 1 && currentRating <= 5 ? currentRating : null;

        if (newStatus === null) {
            if (!existingGame) return;
            const result = await deleteGame(gameId);
            if (result.success) {
                toast.success('Game removed from your list');
                setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, status: null, user_rating: 0 } : g)));
            }
            return;
        }

        if (existingGame) {
            const result = await updateGame(gameId, newStatus, validRating ?? existingGame.rating);
            if (result.success) {
                toast.success(`Status changed to "${STATUS_LABELS[newStatus] || newStatus}"`);
                setGames((prev) =>
                    prev.map((g) => (g.id === gameId ? { ...g, status: newStatus, user_rating: validRating ?? g.user_rating } : g))
                );
            }
        } else {
            const result = await addGame(gameId, newStatus, validRating);
            if (result.success) {
                toast.success(`Added as "${STATUS_LABELS[newStatus]}"`);
                setGames((prev) =>
                    prev.map((g) => (g.id === gameId ? { ...g, status: newStatus, user_rating: validRating ?? 0 } : g))
                );
            }
        }
    }, [addGame, updateGame, deleteGame]);

    const handleRatingChange = useCallback(async (gameId, rating) => {
        const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);
        if (!existingGame) {
            toast.error('First add the game to your list');
            return;
        }
        const result = await updateGame(existingGame.igdb_game_id, existingGame.status, rating);
        if (result.success) {
            toast.success(`Saved rating: ${rating}`);
            setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, user_rating: rating } : g)));
        }
    }, [updateGame]);

    const hasActiveFilters = Boolean(genreId || excludeGenreId || platformId || gameModeId || minYear || minRating);

    const resetFilters = () => {
        setGenreId('');
        setExcludeGenreId('');
        setPlatformId('');
        setGameModeId('');
        setMinYear('');
        setMinRating('');
    };

    const genreSelectOptions = [
        { value: '', label: 'All Genres' },
        ...availableGenres.map((g) => ({ value: String(g.id), label: g.name })),
    ];

    const excludeGenreSelectOptions = [
        { value: '', label: 'None Excluded' },
        ...availableGenres.map((g) => ({ value: String(g.id), label: g.name })),
    ];

    const visibleModes = isAuthenticated ? MODES : MODES.filter((m) => !m.requiresAuth);

    return (
        <div className="min-h-screen bg-primary-navy text-white flex flex-col">
            <Navbar transparentMode={false} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16">
                {/* Guest Banner */}
                {!isAuthenticated && (
                    <div className="mb-6 rounded-2xl bg-primary-navy-dark border border-primary-yellow/25 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-bold text-white">
                                Sign in to unlock personalized recommendations
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                You are browsing top community picks. Sign in to get match scores based on your library, ratings, and Steam playtime.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 rounded-xl bg-primary-yellow hover:bg-yellow-300 text-primary-navy font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer"
                        >
                            <LogIn size={14} />
                            Sign In
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                                <Astroid className="text-primary-yellow" size={28} />
                                {isAuthenticated ? 'Recommended for You' : 'Curated Picks'}
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {isAuthenticated
                                    ? MODES.find((m) => m.id === mode)?.description
                                    : 'Critically acclaimed titles and community favorites across genres'}
                            </p>
                        </div>

                        {/* Taste Profile Chips (only authenticated) */}
                        {isAuthenticated && profileSummary && profileSummary.seed_count > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-gray-500">Top affinities:</span>
                                {profileSummary.top_genres?.map((g) => (
                                    <span
                                        key={`tg-${g.id}`}
                                        className="px-2.5 py-1 rounded-full bg-primary-navy-dark text-gray-200 font-medium"
                                    >
                                        {g.name}
                                    </span>
                                ))}
                                {profileSummary.top_themes?.slice(0, 2).map((t) => (
                                    <span
                                        key={`tt-${t.id}`}
                                        className="px-2.5 py-1 rounded-full bg-primary-yellow/10 text-primary-yellow font-medium"
                                    >
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAuthenticated ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3 mb-6`}>
                    {visibleModes.map((m) => {
                        const Icon = m.icon;
                        const active = mode === m.id;
                        const label = !isAuthenticated && m.id === 'for_you' ? 'Top Rated' : m.label;
                        const desc = !isAuthenticated && m.id === 'for_you'
                            ? 'Highest-rated releases across all genres and platforms'
                            : m.description;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setMode(m.id)}
                                className={`text-left p-4 rounded-xl border border-transparent cursor-pointer transition-all ${active
                                    ? 'bg-primary-navy-dark shadow-lg ring-1 ring-primary-yellow/30'
                                    : 'bg-primary-navy-dark/60 hover:bg-primary-navy-light'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon size={16} className={active ? 'text-primary-yellow' : 'text-gray-400'} />
                                    <span className={`font-bold text-sm ${active ? 'text-primary-yellow' : 'text-white'}`}>
                                        {label}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2">{desc}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Seed Picker for "Because You Played" mode */}
                {isAuthenticated && mode === 'because_you_played' && (
                    <div className="bg-primary-navy-dark rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-yellow whitespace-nowrap">
                            Anchor Game:
                        </span>
                        <div className="flex-1 max-w-md">
                            {seedOptions.length > 0 ? (
                                <CustomSelect options={seedOptions} value={seedGameId} onChange={setSeedGameId} />
                            ) : (
                                <p className="text-xs text-gray-400">Add or rate a game in your library first to use this mode.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Filter Bar */}
                <div className="bg-primary-navy-dark rounded-xl p-4 mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                            <SlidersHorizontal size={14} className="text-primary-yellow" /> Refine Results
                        </span>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1 text-xs text-primary-yellow hover:opacity-80 cursor-pointer"
                            >
                                <RotateCcw size={12} /> Reset filters
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Platform</label>
                            <CustomSelect options={PLATFORM_OPTIONS} value={platformId} onChange={setPlatformId} />
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Include Genre</label>
                            <CustomSelect options={genreSelectOptions} value={genreId} onChange={setGenreId} />
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Exclude Genre</label>
                            <CustomSelect options={excludeGenreSelectOptions} value={excludeGenreId} onChange={setExcludeGenreId} />
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Game Mode</label>
                            <CustomSelect options={GAME_MODE_OPTIONS} value={gameModeId} onChange={setGameModeId} />
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Release Era</label>
                            <CustomSelect options={MIN_YEAR_OPTIONS} value={minYear} onChange={setMinYear} />
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Min Score</label>
                            <CustomSelect options={MIN_RATING_OPTIONS} value={minRating} onChange={setMinRating} />
                        </div>
                    </div>
                </div>

                {/* Results Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <InteractiveGameCardSkeleton key={`rec-page-skel-${i}`} />
                        ))}
                    </div>
                ) : games.length === 0 ? (
                    <div className="bg-primary-navy-dark rounded-xl p-12 text-center">
                        <p className="text-gray-300 font-medium mb-2">No recommendations matched this exact combination.</p>
                        <p className="text-xs text-gray-500 mb-4">
                            {mode === 'backlog'
                                ? 'Your backlog is empty or none of your backlog games match the active filters.'
                                : 'Try relaxing one of the filters or switching recommendation mode.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="bg-primary-yellow text-primary-navy-dark px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {games.map((game) => (
                            <div key={game.id} className="flex flex-col">
                                <InteractiveGameCard
                                    game={game}
                                    interactive={isAuthenticated}
                                    showMatchBadge={isAuthenticated}
                                    onStatusChange={handleStatusChange}
                                    onRatingChange={handleRatingChange}
                                />
                                {isAuthenticated && game.reasons?.length > 0 && (
                                    <div className="mt-2 px-1 space-y-0.5">
                                        {game.reasons.map((reason, idx) => (
                                            <p
                                                key={idx}
                                                className="text-[11px] text-gray-400 truncate flex items-center gap-1"
                                                title={reason}
                                            >
                                                <Astroid size={10} className="text-primary-yellow shrink-0" />
                                                <span className="truncate">{reason}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Recommendations;