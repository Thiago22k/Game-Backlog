import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Gamepad2, ChevronDown, ArrowLeft } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import LikedGameCard from '../../components/games/LikedGameCard';
import axios from '../../api/axios';

const PAGE_SIZE = 20;

const ProfileLikedGames = () => {
    const { username } = useParams();
    const { user } = useAuth();
    // games from ProfileLayout outlet = always the profile owner's library
    const { games: ownerGames = [] } = useOutletContext() || {};

    const [rawGames, setRawGames] = useState([]);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('recent');

    usePageTitle(`${username}'s Liked Games`);

    // Convertir ownerGames a un Map (O(1) lookup en lugar de O(N))
    const ownerGamesMap = useMemo(
        () => new Map(ownerGames.map(g => [g.igdb_game_id, g])),
        [ownerGames]
    );

    // Reactively merge owner's status/rating into liked games whenever ownerGames updates.
    const allGames = useMemo(() =>
        rawGames.map(g => {
            const ownerEntry = ownerGamesMap.get(g.igdb_game_id);
            return {
                ...g,
                game_details: {
                    ...g.game_details,
                    owner_status: ownerEntry?.status ?? null,
                    owner_rating: ownerEntry?.rating ?? 0,
                }
            };
        }),
        [rawGames, ownerGamesMap]
    );

    useEffect(() => {
        if (!username) return;
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/games/likes/by-username/${username}`);
                setRawGames(res.data.games || []);
            } catch {
                setRawGames([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, user]);

    // ─── Card renderer ────────────────────────────────────────────────────
    const renderGameCard = useCallback((g) => {
        const mappedGame = {
            ...g.game_details,
            id: g.igdb_game_id,
        };
        return <LikedGameCard game={mappedGame} />;
    }, []);

    const sortedGames = useMemo(() => {
        const result = [...allGames];
        switch (sortBy) {
            case 'name':
                result.sort((a, b) => (a.game_details?.name || '').localeCompare(b.game_details?.name || ''));
                break;
            case 'rating-high':
                result.sort((a, b) => (b.game_details?.owner_rating || 0) - (a.game_details?.owner_rating || 0));
                break;
            case 'rating-low':
                result.sort((a, b) => (a.game_details?.owner_rating || 0) - (b.game_details?.owner_rating || 0));
                break;
            case 'release-new':
                result.sort((a, b) => (b.game_details?.first_release_date || 0) - (a.game_details?.first_release_date || 0));
                break;
            case 'release-old':
                result.sort((a, b) => (a.game_details?.first_release_date || 0) - (b.game_details?.first_release_date || 0));
                break;
            case 'recent':
            default:
                // mantiene el orden original del servidor (más reciente primero)
                break;
        }
        return result;
    }, [allGames, sortBy]);

    const visibleGames = sortedGames.slice(0, visibleCount);
    const hasMore = visibleCount < sortedGames.length;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Gamepad2 size={20} className="text-primary-yellow" />
                    Liked Games
                    {!loading && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                            ({allGames.length})
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Sort by:</span>
                        <CustomSelect
                            options={[
                                { value: 'recent', label: 'Recently Liked' },
                                { value: 'name', label: 'Name (A-Z)' },
                                { value: 'rating-high', label: 'Rating (High-Low)' },
                                { value: 'rating-low', label: 'Rating (Low-High)' },
                                { value: 'release-new', label: 'Release Date (Newest)' },
                                { value: 'release-old', label: 'Release Date (Oldest)' },
                            ]}
                            value={sortBy}
                            onChange={(val) => { setSortBy(val); setVisibleCount(PAGE_SIZE); }}
                        />
                    </div>
                    <Link
                        to={`/profile/${username}/likes`}
                        className="text-sm text-gray-400 hover:text-primary-yellow transition-colors flex items-center gap-1"
                    >
                        <ArrowLeft size={14} />
                        Back to Likes
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </div>
            ) : allGames.length === 0 ? (
                <div className="text-center py-14 bg-primary-navy-dark rounded-xl">
                    <Gamepad2 size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">
                        {username === user?.username
                            ? "You haven't liked any games yet."
                            : `${username} hasn't liked any games yet.`}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {visibleGames.map((g) => (
                            <div key={g.igdb_game_id} className="relative group h-full">
                                {renderGameCard(g)}
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center mt-10">
                            <button
                                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary-navy-dark border border-gray-700 hover:border-primary-yellow text-white hover:text-primary-yellow rounded-full font-medium transition-all text-sm"
                            >
                                <ChevronDown size={16} />
                                Load more ({allGames.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProfileLikedGames;
