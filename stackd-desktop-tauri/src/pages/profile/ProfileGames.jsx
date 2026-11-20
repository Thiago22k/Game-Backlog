import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Clock, Gamepad2, Search } from 'lucide-react';
import InteractiveGameCard from '../../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../../components/games/AnticipatedGameCard';
import InteractiveGameCardSkeleton from '../../components/games/InteractiveGameCardSkeleton';
import AnticipatedGameCardSkeleton from '../../components/games/AnticipatedGameCardSkeleton';
import CustomSelect from '../../components/common/CustomSelect';
import SteamEmptyPrompt from '../../components/profile/SteamEmptyPrompt';

const ProfileGames = () => {
    const navigate = useNavigate();
    const gridRef = useRef(null);
    const wishlistGridRef = useRef(null);
    // Obtener el hook desde el Outlet
    const { games, loading, updateGame, deleteGame, addGame, isOwner, steamPrompt } = useOutletContext();

    const [searchParams, setSearchParams] = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [ratingFilter, setRatingFilter] = useState(searchParams.get('rating') || 'all');
    const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || 'all');
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recent');
    const [currentWishlistPage, setCurrentWishlistPage] = useState(1);

    const RATING_OPTIONS = [
        { value: 'all', label: 'All' },
        { value: '5', label: '★ 5' },
        { value: '4.5', label: '★ 4.5' },
        { value: '4', label: '★ 4' },
        { value: '3.5', label: '★ 3.5' },
        { value: '3', label: '★ 3' },
        { value: '2.5', label: '★ 2.5' },
        { value: '2', label: '★ 2' },
        { value: '1.5', label: '★ 1.5' },
        { value: '1', label: '★ 1' },
        { value: '0.5', label: '★ 0.5' },
        { value: 'none', label: 'Unrated' },
    ];

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12; // 3 filas de 4 tarjetas

    // Resetear a página 1 cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
        setCurrentWishlistPage(1);

        // Update URL params
        const newParams = new URLSearchParams(searchParams);
        if (searchQuery) newParams.set('search', searchQuery); else newParams.delete('search');
        if (statusFilter !== 'all') newParams.set('status', statusFilter); else newParams.delete('status');
        if (ratingFilter !== 'all') newParams.set('rating', ratingFilter); else newParams.delete('rating');
        if (sourceFilter !== 'all') newParams.set('source', sourceFilter); else newParams.delete('source');
        if (sortBy !== 'recent') newParams.set('sort', sortBy); else newParams.delete('sort');

        setSearchParams(newParams, { replace: true });
    }, [searchQuery, statusFilter, ratingFilter, sourceFilter, sortBy]);

    const { wishlistComingSoon, myGames } = useMemo(() => {
        const now = new Date();
        const wishlist = [];
        const my = [];

        games.forEach(game => {
            const releaseDate = game.game_details?.first_release_date
                ? new Date(game.game_details.first_release_date * 1000)
                : null;

            // Añadimos un periodo de gracia de 24 horas después del lanzamiento
            // para que los juegos que salen hoy (o salieron hace menos de un día)
            // se mantengan en la sección de "Coming Soon" si están en wishlist.
            const releaseThreshold = releaseDate
                ? new Date(releaseDate.getTime() + 24 * 60 * 60 * 1000)
                : null;

            if (game.status === 'wishlist' && (!releaseThreshold || releaseThreshold > now)) {
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

        if (ratingFilter === 'none') {
            result = result.filter(game => !game.rating);
        } else if (ratingFilter !== 'all') {
            const target = parseFloat(ratingFilter);
            result = result.filter(game => parseFloat(game.rating) === target);
        }

        if (sourceFilter === 'steam') {
            result = result.filter(game => game.source === 'steam');
        } else if (sourceFilter === 'manual') {
            result = result.filter(game => game.source !== 'steam');
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
            case 'release-new':
                result.sort((a, b) => (b.game_details?.first_release_date || 0) - (a.game_details?.first_release_date || 0));
                break;
            case 'release-old':
                result.sort((a, b) => (a.game_details?.first_release_date || 0) - (b.game_details?.first_release_date || 0));
                break;
            case 'recent':
            default:
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }

        return result;
    }, [myGames, searchQuery, statusFilter, ratingFilter, sourceFilter, sortBy]);

    const totalPages = Math.ceil(processedMyGames.length / itemsPerPage);
    const wishlistTotalPages = Math.ceil(filteredWishlist.length / itemsPerPage);

    const paginatedGames = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedMyGames.slice(startIndex, startIndex + itemsPerPage);
    }, [processedMyGames, currentPage]);

    const paginatedWishlist = useMemo(() => {
        const startIndex = (currentWishlistPage - 1) * itemsPerPage;
        return filteredWishlist.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredWishlist, currentWishlistPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleWishlistPageChange = (newPage) => {
        if (newPage >= 1 && newPage <= wishlistTotalPages) {
            setCurrentWishlistPage(newPage);
        }
    };

    // Scroll to the top of the grid section when the page changes
    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentPage]);

    // Scroll to the top of the wishlist section when the wishlist page changes
    useEffect(() => {
        if (wishlistGridRef.current) {
            wishlistGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentWishlistPage]);

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
            source: game.source,
        };
    }, []);

    return (
        <>
            <div className="mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={isOwner ? "Search your games..." : "Search games..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-primary-navy-dark rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-yellow transition-colors"
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
                <div className="text-center py-12 px-4 bg-primary-navy-dark rounded-lg">
                    <p className="text-gray-400 mb-4">
                        {isOwner ? "You don't have any games in your collection yet." : "This user doesn't have any games in their collection yet."}
                    </p>
                    {isOwner && <SteamEmptyPrompt prompt={steamPrompt} />}
                    {isOwner && (
                        <button
                            onClick={() => navigate('/explore')}
                            className={
                                steamPrompt?.emptyMode
                                    ? 'border border-white/15 text-white px-6 py-2 rounded-lg hover:bg-white/5 font-semibold transition-all'
                                    : 'bg-primary-yellow text-primary-navy-dark px-6 py-2 rounded-lg hover:opacity-90 font-semibold transition-all'
                            }
                        >
                            {steamPrompt?.emptyMode ? 'Or explore games' : 'Explore Games'}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {filteredWishlist.length > 0 && (
                        <section ref={wishlistGridRef} className="mb-12 scroll-mt-24">
                            <div className="flex items-center mb-6">
                                <Clock className="text-primary-yellow mr-2" size={24} />
                                <h3 className="text-2xl font-bold text-white">
                                    {isOwner ? 'My Wishlist (Coming Soon)' : 'Wishlist'}
                                </h3>
                                <span className="ml-3 text-gray-400">
                                    {filteredWishlist.length} game{filteredWishlist.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {paginatedWishlist.map((game) => (
                                    <AnticipatedGameCard
                                        key={game.id}
                                        game={mapGameForCard(game)}
                                        interactive={isOwner}
                                        showWishlistButton={isOwner}
                                        onWishlistToggle={handleWishlistToggle}
                                    />
                                ))}
                            </div>

                            {/* Pagination Controls for Wishlist */}
                            {wishlistTotalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                                    <button
                                        onClick={() => handleWishlistPageChange(currentWishlistPage - 1)}
                                        disabled={currentWishlistPage === 1}
                                        className={`px-4 py-2 rounded-full font-medium transition-colors border text-sm flex items-center ${currentWishlistPage === 1
                                            ? 'bg-gray-800/20 text-gray-600 border-gray-800/30 cursor-not-allowed'
                                            : 'bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700 backdrop-blur-sm'
                                            }`}
                                    >
                                        Prev
                                    </button>

                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: wishlistTotalPages }).map((_, idx) => {
                                            const pageNum = idx + 1;
                                            if (
                                                pageNum === 1 ||
                                                pageNum === wishlistTotalPages ||
                                                (pageNum >= currentWishlistPage - 1 && pageNum <= currentWishlistPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={`wish-pg-${pageNum}`}
                                                        onClick={() => handleWishlistPageChange(pageNum)}
                                                        className={`w-10 h-10 rounded-full font-medium transition-all flex items-center justify-center text-sm border ${currentWishlistPage === pageNum
                                                            ? 'bg-primary-yellow text-primary-navy-dark border-primary-yellow scale-110 shadow-sm'
                                                            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white backdrop-blur-sm'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            } else if (
                                                pageNum === currentWishlistPage - 2 ||
                                                pageNum === currentWishlistPage + 2
                                            ) {
                                                return <span key={`wish-dots-${pageNum}`} className="text-gray-500 px-1">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handleWishlistPageChange(currentWishlistPage + 1)}
                                        disabled={currentWishlistPage === wishlistTotalPages}
                                        className={`px-4 py-2 rounded-full font-medium transition-colors border text-sm flex items-center ${currentWishlistPage === wishlistTotalPages
                                            ? 'bg-gray-800/20 text-gray-600 border-gray-800/30 cursor-not-allowed'
                                            : 'bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700 backdrop-blur-sm'
                                            }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {myGames.length > 0 && (
                        <section ref={gridRef} className="scroll-mt-24">
                            <div className="flex items-center mb-6">
                                <Gamepad2 className="text-primary-yellow mr-2" size={24} />
                                <h3 className="text-2xl font-bold text-white">
                                    {isOwner ? 'My Games' : 'Games Library'}
                                </h3>
                                <span className="ml-3 text-gray-400">
                                    {processedMyGames.length} / {myGames.length} game{myGames.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="mb-6 space-y-4">
                                {/* Status filter */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-gray-400 text-sm self-center mr-2">Status:</span>
                                    {[
                                        { value: 'all', label: 'All' },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'playing', label: 'Playing' },
                                        { value: 'wishlist', label: 'Wishlist' },
                                        { value: 'backlog', label: 'Backlog' },
                                        { value: 'dropped', label: 'Dropped' },
                                    ].map(status => (
                                        <button
                                            key={status.value}
                                            onClick={() => setStatusFilter(status.value)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${statusFilter === status.value
                                                ? 'bg-primary-yellow text-primary-navy-dark'
                                                : 'bg-primary-navy-dark text-gray-400 hover:text-white hover:bg-primary-navy-light'
                                                }`}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Rating, Source & Sort */}
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 min-w-[120px] flex-1">
                                        <span className="text-gray-400 text-sm whitespace-nowrap">Rating:</span>
                                        <div className="flex-1">
                                            <CustomSelect
                                                options={RATING_OPTIONS}
                                                value={ratingFilter}
                                                onChange={setRatingFilter}
                                            />
                                        </div>
                                    </div>
                                    {myGames.some(g => g.source === 'steam') && (
                                        <div className="flex items-center gap-2 min-w-[130px] flex-1">
                                            <span className="text-gray-400 text-sm whitespace-nowrap">Source:</span>
                                            <div className="flex-1">
                                                <CustomSelect
                                                    options={[
                                                        { value: 'all', label: 'All Sources' },
                                                        { value: 'steam', label: 'Steam' },
                                                        { value: 'manual', label: 'Manual' },
                                                    ]}
                                                    value={sourceFilter}
                                                    onChange={setSourceFilter}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 min-w-[150px] flex-1">
                                        <span className="text-gray-400 text-sm whitespace-nowrap">Sort by:</span>
                                        <div className="flex-1">
                                            <CustomSelect
                                                options={[
                                                    { value: 'recent', label: 'Recently Added' },
                                                    { value: 'name', label: 'Name (A-Z)' },
                                                    { value: 'rating-high', label: 'Rating (High-Low)' },
                                                    { value: 'rating-low', label: 'Rating (Low-High)' },
                                                    { value: 'release-new', label: 'Release Date (Newest)' },
                                                    { value: 'release-old', label: 'Release Date (Oldest)' },
                                                ]}
                                                value={sortBy}
                                                onChange={setSortBy}
                                            />
                                        </div>
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
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
                                        {paginatedGames.map((game) => (
                                            <InteractiveGameCard
                                                key={game.id}
                                                game={mapGameForCard(game)}
                                                interactive={isOwner}
                                                showStatus={isOwner}
                                                onStatusChange={handleStatusChange}
                                                onRatingChange={handleRatingChange}
                                            />
                                        ))}
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className={`px-4 py-2 rounded-full font-medium transition-colors border text-sm flex items-center ${currentPage === 1
                                                    ? 'bg-gray-800/20 text-gray-600 border-gray-800/30 cursor-not-allowed'
                                                    : 'bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700 backdrop-blur-sm'
                                                    }`}
                                            >
                                                Prev
                                            </button>

                                            <div className="flex items-center gap-1 mx-2">
                                                {/* Logic to show pages (simplified for most use cases < 10 pages) */}
                                                {Array.from({ length: totalPages }).map((_, idx) => {
                                                    const pageNum = idx + 1;
                                                    // Show first, last, current, and adjacent pages
                                                    if (
                                                        pageNum === 1 ||
                                                        pageNum === totalPages ||
                                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                                    ) {
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => handlePageChange(pageNum)}
                                                                className={`w-10 h-10 rounded-full font-medium transition-all flex items-center justify-center text-sm border ${currentPage === pageNum
                                                                    ? 'bg-primary-yellow text-primary-navy-dark border-primary-yellow scale-110 shadow-sm'
                                                                    : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white backdrop-blur-sm'
                                                                    }`}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        );
                                                    } else if (
                                                        pageNum === currentPage - 2 ||
                                                        pageNum === currentPage + 2
                                                    ) {
                                                        return <span key={pageNum} className="text-gray-500 px-1">...</span>;
                                                    }
                                                    return null;
                                                })}
                                            </div>

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className={`px-4 py-2 rounded-full font-medium transition-colors border text-sm flex items-center ${currentPage === totalPages
                                                    ? 'bg-gray-800/20 text-gray-600 border-gray-800/30 cursor-not-allowed'
                                                    : 'bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700 backdrop-blur-sm'
                                                    }`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
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
            )
            }
        </>
    );
};

export default ProfileGames;
