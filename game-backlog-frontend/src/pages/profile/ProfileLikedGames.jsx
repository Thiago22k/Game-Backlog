import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Gamepad2, ChevronDown, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGames } from '../../hooks/useGames';
import InteractiveGameCard from '../../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../../components/games/AnticipatedGameCard';
import axios from '../../api/axios';

const PAGE_SIZE = 20;

const ProfileLikedGames = () => {
    const { username } = useParams();
    const { user } = useAuth();
    const { addGame, updateGame, deleteGame, getUserGames } = useGames();

    const [allGames, setAllGames] = useState([]);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const userGamesRef = useRef([]);

    useEffect(() => {
        if (!username) return;
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/games/likes/by-username/${username}`);
                let games = res.data.games || [];

                if (user) {
                    const ugRes = await getUserGames();
                    const userGamesList = ugRes?.data ?? [];
                    userGamesRef.current = userGamesList;
                    games = games.map(g => {
                        const ug = userGamesList.find(u => u.igdb_game_id === g.igdb_game_id);
                        return {
                            ...g,
                            game_details: {
                                ...g.game_details,
                                status: ug?.status ?? null,
                                user_rating: ug?.rating ?? 0,
                            }
                        };
                    });
                }
                setAllGames(games);
            } catch {
                setAllGames([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, user]);

    // ─── Card handlers ────────────────────────────────────────────────────
    const updateLocalGame = (igdbGameId, patch) => {
        setAllGames(prev => prev.map(g =>
            g.igdb_game_id === igdbGameId
                ? { ...g, game_details: { ...g.game_details, ...patch } }
                : g
        ));
    };

    const handleWishlistToggle = useCallback(async (gameId, newStatus) => {
        if (!user) return;
        const existing = userGamesRef.current.find(g => g.igdb_game_id === gameId);
        if (newStatus === null && existing) {
            const res = await deleteGame(gameId);
            if (res.success) updateLocalGame(gameId, { status: null, user_rating: 0 });
        } else if (newStatus === 'wishlist') {
            const res = await addGame(gameId, 'wishlist');
            if (res.success) updateLocalGame(gameId, { status: 'wishlist', user_rating: 0 });
        }
    }, [user, addGame, deleteGame]);

    const handleStatusChange = useCallback(async (gameId, newStatus, currentRating = 0) => {
        if (!user) return;
        const existing = userGamesRef.current.find(g => g.igdb_game_id === gameId);
        const validRating = currentRating >= 1 && currentRating <= 5 ? currentRating : null;
        if (newStatus === null) {
            if (!existing) return;
            const res = await deleteGame(gameId);
            if (res.success) updateLocalGame(gameId, { status: null, user_rating: 0 });
            return;
        }
        if (existing) {
            const res = await updateGame(gameId, newStatus, validRating ?? existing.rating);
            if (res.success) updateLocalGame(gameId, { status: newStatus, user_rating: validRating ?? undefined });
        } else {
            const res = await addGame(gameId, newStatus, validRating);
            if (res.success) updateLocalGame(gameId, { status: newStatus, user_rating: validRating ?? 0 });
        }
    }, [user, addGame, updateGame, deleteGame]);

    const handleRatingChange = useCallback(async (gameId, rating) => {
        if (!user) return;
        const existing = userGamesRef.current.find(g => g.igdb_game_id === gameId);
        if (!existing) return;
        const res = await updateGame(gameId, existing.status, rating);
        if (res.success) updateLocalGame(gameId, { user_rating: rating });
    }, [user, updateGame]);

    // ─── Card renderer ────────────────────────────────────────────────────
    const renderGameCard = (g) => {
        const releaseDate = g.game_details?.first_release_date
            ? new Date(g.game_details.first_release_date * 1000)
            : null;
        const isUnreleased = !releaseDate || releaseDate > new Date();
        const mappedGame = {
            ...g.game_details,
            id: g.igdb_game_id,
            status: g.game_details?.status,
            user_rating: g.game_details?.user_rating,
        };
        return isUnreleased ? (
            <AnticipatedGameCard
                game={mappedGame}
                interactive={!!user}
                showWishlistButton={!!user}
                onWishlistToggle={handleWishlistToggle}
            />
        ) : (
            <InteractiveGameCard
                game={mappedGame}
                interactive={!!user}
                showStatus={true}
                onStatusChange={handleStatusChange}
                onRatingChange={handleRatingChange}
            />
        );
    };

    const visibleGames = allGames.slice(0, visibleCount);
    const hasMore = visibleCount < allGames.length;

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
                <Link
                    to={`/profile/${username}/likes`}
                    className="text-sm text-gray-400 hover:text-primary-yellow transition-colors flex items-center gap-1"
                >
                    <ArrowLeft size={14} />
                    Back to Likes
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </div>
            ) : allGames.length === 0 ? (
                <div className="text-center py-14 bg-primary-navy-dark border border-gray-700 rounded-xl">
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
