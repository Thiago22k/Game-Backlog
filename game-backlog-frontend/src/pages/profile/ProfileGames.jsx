import { useState, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Clock, Gamepad2, Search } from 'lucide-react';
import InteractiveGameCard from '../../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../../components/games/AnticipatedGameCard';
import InteractiveGameCardSkeleton from '../../components/games/InteractiveGameCardSkeleton';
import AnticipatedGameCardSkeleton from '../../components/games/AnticipatedGameCardSkeleton';

const ProfileGames = () => {
    const navigate = useNavigate();
    // Obtener el hook desde el Outlet
    const { games, loading, updateGame, deleteGame, addGame } = useOutletContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [sortBy, setSortBy] = useState('recent');

    const { wishlistComingSoon, myGames } = useMemo(() => {
        const now = new Date();
        const wishlist = [];
        const my = [];

        games.forEach(game => {
            const releaseDate = game.game_details?.first_release_date
                ? new Date(game.game_details.first_release_date * 1000)
                : null;

            if (game.status === 'wishlist' && (!releaseDate || releaseDate > now)) {
                wishlist.push(game);
            } else {
                my.push(game);
            }
        });

        return { wishlistComingSoon: wishlist, myGames: my };
    }, [games]);

    const filteredWishlist = useMemo(() => {
        if (!searchQuery.trim()) return wishlistComingSoon;
        const query = searchQuery.toLowerCase();
        return wishlistComingSoon.filter(game =>
            game.game_details?.name?.toLowerCase().includes(query)
        );
    }, [searchQuery, wishlistComingSoon]);

    const processedMyGames = useMemo(() => {
        let result = myGames;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(game => game.game_details?.name?.toLowerCase().includes(query));
        }

        if (statusFilter !== 'all') {
            result = result.filter(game => game.status === statusFilter);
        }

        if (ratingFilter !== 'all') {
            const targetRating = parseInt(ratingFilter, 10);
            result = result.filter(game => game.rating === targetRating);
        }

        result = [...result];
        switch (sortBy) {
            case 'name':
                result.sort((a, b) => (a.game_details?.name || '').localeCompare(b.game_details?.name || ''));
                break;
            case 'rating-high':
                result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'rating-low':
                result.sort((a, b) => (a.rating || 0) - (b.rating || 0));
                break;
            case 'recent':
            default:
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }

        return result;
    }, [myGames, searchQuery, statusFilter, ratingFilter, sortBy]);

    const handleStatusChange = useCallback(async (gameId, newStatus) => {
        const game = games.find(g => g.igdb_game_id === gameId);

        if (newStatus === null && game) {
            const result = await deleteGame(gameId);
            if (result.success) {
                toast.success('Game removed from your list');
            } else {
                toast.error('Error removing game');
            }
        } else if (game) {
            const result = await updateGame(gameId, newStatus, game.rating);
            if (result.success) {
                toast.success('Status updated');
            } else {
                toast.error('Error updating status');
            }
        }
    }, [games, deleteGame, updateGame]);

    const handleRatingChange = useCallback(async (gameId, rating) => {
        const game = games.find(g => g.igdb_game_id === gameId);

        if (game) {
            const result = await updateGame(gameId, game.status, rating);
            if (result.success) {
                toast.success(`Rating saved: ${rating} ⭐`);
            } else {
                toast.error('Error saving rating');
            }
        }
    }, [games, updateGame]);

    const handleWishlistToggle = useCallback(async (gameId, newStatus) => {
        if (newStatus === null) {
            const result = await deleteGame(gameId);
            if (result.success) {
                toast.success('Removed from wishlist');
            } else {
                toast.error('Error removing from wishlist');
            }
        } else {
            const result = await addGame(gameId, 'wishlist');
            if (result.success) {
                toast.success('Added to wishlist');
            } else {
                toast.error('Error adding to wishlist');
            }
        }
    }, [deleteGame, addGame]);

    const mapGameForCard = useCallback((game) => {
        return {
            id: game.igdb_game_id,
            slug: game.game_details?.slug,
            name: game.game_details?.name || 'Unknown',
            cover: game.game_details?.cover,
            artworks: game.game_details?.artworks,
            screenshots: game.game_details?.screenshots,
            genres: game.game_details?.genres,
            first_release_date: game.game_details?.first_release_date,
            rating: game.game_details?.rating,
            status: game.status,
            user_rating: game.rating,
        };
    }, []);

    return (
        <>
            <div className="mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search your games..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-primary-navy-dark border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-yellow transition-colors"
                    />
                </div>
            </div>

            {loading ? (
                <>
                    <section className="mb-12 pointer-events-none">
                        <div className="flex items-center mb-6">
                            <div className="h-8 w-64 bg-gray-700 rounded animate-pulse"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <AnticipatedGameCardSkeleton key={`wish-skel-${i}`} />
                            ))}
                        </div>
                    </section>

                    <section className="pointer-events-none">
                        <div className="flex items-center mb-6">
                            <div className="h-8 w-48 bg-gray-700 rounded animate-pulse"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <InteractiveGameCardSkeleton key={`my-skel-${i}`} />
                            ))}
                        </div>
                    </section>
                </>
            ) : games.length === 0 ? (
                <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
                    <p className="text-gray-400 mb-4">
                        You don't have any games in your collection yet.
                    </p>
                    <button
                        onClick={() => navigate('/explore')}
                        className="bg-primary-yellow text-primary-navy-dark px-6 py-2 rounded-lg hover:opacity-90 font-semibold transition-all"
                    >
                        Explore Games
                    </button>
                </div>
            ) : (
                <>
                    {filteredWishlist.length > 0 && (
                        <section className="mb-12">
                            <div className="flex items-center mb-6">
                                <Clock className="text-primary-yellow mr-2" size={24} />
                                <h3 className="text-2xl font-bold text-white">
                                    My Wishlist (Coming Soon)
                                </h3>
                                <span className="ml-3 text-gray-400">
                                    {filteredWishlist.length} game{filteredWishlist.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {filteredWishlist.map((game) => (
                                    <AnticipatedGameCard
                                        key={game.id}
                                        game={mapGameForCard(game)}
                                        interactive={true}
                                        onWishlistToggle={handleWishlistToggle}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {myGames.length > 0 && (
                        <section>
                            <div className="flex items-center mb-6">
                                <Gamepad2 className="text-primary-yellow mr-2" size={24} />
                                <h3 className="text-2xl font-bold text-white">
                                    My Games
                                </h3>
                                <span className="ml-3 text-gray-400">
                                    {processedMyGames.length} / {myGames.length} game{myGames.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="mb-6 space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-gray-400 text-sm self-center mr-2">Status:</span>
                                    {[
                                        { value: 'all', label: 'All' },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'playing', label: 'Playing' },
                                        { value: 'wishlist', label: 'Wishlist' },
                                        { value: 'dropped', label: 'Dropped' },
                                    ].map(status => (
                                        <button
                                            key={status.value}
                                            onClick={() => setStatusFilter(status.value)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === status.value
                                                ? 'bg-primary-yellow text-primary-navy-dark'
                                                : 'bg-primary-navy-dark text-gray-400 hover:text-white border border-gray-700'
                                                }`}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-sm">Rating:</span>
                                        <select
                                            value={ratingFilter}
                                            onChange={(e) => setRatingFilter(e.target.value)}
                                            className="bg-primary-navy-dark border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-yellow"
                                        >
                                            <option value="all">All</option>
                                            <option value="5">⭐⭐⭐⭐⭐(5)</option>
                                            <option value="4">⭐⭐⭐⭐ (4)</option>
                                            <option value="3">⭐⭐⭐ (3)</option>
                                            <option value="2">⭐⭐ (2)</option>
                                            <option value="1">⭐ (1)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-sm">Sort by:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="bg-primary-navy-dark border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-yellow"
                                        >
                                            <option value="recent">Recently Added</option>
                                            <option value="name">Name (A-Z)</option>
                                            <option value="rating-high">Rating (High-Low)</option>
                                            <option value="rating-low">Rating (Low-High)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {processedMyGames.length === 0 ? (
                                <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
                                    <p className="text-gray-400">
                                        No games match your filters.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                    {processedMyGames.map((game) => (
                                        <InteractiveGameCard
                                            key={game.id}
                                            game={mapGameForCard(game)}
                                            interactive={true}
                                            onStatusChange={handleStatusChange}
                                            onRatingChange={handleRatingChange}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {searchQuery && filteredWishlist.length === 0 && processedMyGames.length === 0 && (
                        <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
                            <p className="text-gray-400">
                                No games found for "{searchQuery}"
                            </p>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default ProfileGames;
