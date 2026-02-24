import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Gamepad2, Library } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGames } from '../../hooks/useGames';
import { useCollections } from '../../hooks/useCollections';
import CollectionCard from '../../components/collections/CollectionCard';
import InteractiveGameCard from '../../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../../components/games/AnticipatedGameCard';
import axios from '../../api/axios';

const ProfileLikes = () => {
    const { username } = useParams();
    const { user } = useAuth();
    const { addGame, updateGame, deleteGame, getUserGames } = useGames();
    const { toggleLike: toggleCollectionLike } = useCollections();

    const [likedGames, setLikedGames] = useState([]);
    const [likedCollections, setLikedCollections] = useState([]);
    const [loadingGames, setLoadingGames] = useState(true);
    const [loadingCollections, setLoadingCollections] = useState(true);

    // Track the authenticated user's own game list for status/rating on each card
    const userGamesRef = useRef([]);

    useEffect(() => {
        if (!username) return;

        // Fetch liked games
        const fetchGames = async () => {
            setLoadingGames(true);
            try {
                const res = await axios.get(`/games/likes/by-username/${username}`);
                let games = res.data.games || [];

                // If authenticated, merge user status/rating into game details
                if (user) {
                    const ugRes = await getUserGames();
                    const userGamesList = ugRes?.data ?? [];
                    userGamesRef.current = userGamesList;

                    games = games.map(g => {
                        const ug = userGamesList.find(ug => ug.igdb_game_id === g.igdb_game_id);
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

                setLikedGames(games);
            } catch {
                setLikedGames([]);
            } finally {
                setLoadingGames(false);
            }
        };

        // Fetch liked collections
        const fetchCollections = async () => {
            setLoadingCollections(true);
            try {
                const res = await axios.get(`/collections/liked/user/${username}`);
                setLikedCollections(res.data.collections || []);
            } catch {
                setLikedCollections([]);
            } finally {
                setLoadingCollections(false);
            }
        };

        fetchGames();
        fetchCollections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, user]);

    // ─── Game card handlers ────────────────────────────────────────────────

    const updateLocalGame = (igdbGameId, patch) => {
        setLikedGames(prev => prev.map(g =>
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

    // ─── Render helpers ────────────────────────────────────────────────────

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

    const Spinner = () => (
        <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
        </div>
    );

    const MAX_VISIBLE = 8;

    return (
        <div className="space-y-14">
            {/* ── Liked Games ─────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Gamepad2 size={20} className="text-primary-yellow" />
                        Liked Games
                        {!loadingGames && (
                            <span className="text-sm font-normal text-gray-500 ml-1">
                                ({likedGames.length})
                            </span>
                        )}
                    </h3>
                    <Link
                        to={`/profile/${username}/likes/games`}
                        className="text-sm text-gray-400 hover:text-primary-yellow transition-colors flex items-center gap-1"
                    >
                        View all →
                    </Link>
                </div>

                {loadingGames ? (
                    <Spinner />
                ) : likedGames.length === 0 ? (
                    <div className="text-center py-14 bg-primary-navy-dark border border-gray-700 rounded-xl">
                        <Gamepad2 size={40} className="mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400">
                            {username === user?.username
                                ? "You haven't liked any games yet."
                                : `${username} hasn't liked any games yet.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {likedGames.slice(0, MAX_VISIBLE).map((g) => (
                            <div key={g.igdb_game_id} className="relative group h-full">
                                {renderGameCard(g)}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Liked Collections ────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Library size={20} className="text-primary-yellow" />
                        Liked Collections
                        {!loadingCollections && (
                            <span className="text-sm font-normal text-gray-500 ml-1">
                                ({likedCollections.length})
                            </span>
                        )}
                    </h3>
                    <Link
                        to={`/profile/${username}/likes/collections`}
                        className="text-sm text-gray-400 hover:text-primary-yellow transition-colors flex items-center gap-1"
                    >
                        View all →
                    </Link>
                </div>

                {loadingCollections ? (
                    <Spinner />
                ) : likedCollections.length === 0 ? (
                    <div className="text-center py-14 bg-primary-navy-dark border border-gray-700 rounded-xl">
                        <Library size={40} className="mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400">
                            {username === user?.username
                                ? "You haven't liked any collections yet."
                                : `${username} hasn't liked any collections yet.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {likedCollections.slice(0, MAX_VISIBLE).map(collection => (
                            <CollectionCard
                                key={collection.id}
                                collection={collection}
                                isOwner={false}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default ProfileLikes;
