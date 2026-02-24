import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit3, Heart, Share2, Trash2, Calendar, Gamepad2, User as UserIcon, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollections } from '../../hooks/useCollections';
import { useGames } from '../../hooks/useGames';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../layout/Navbar';
import InteractiveGameCard from '../../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../../components/games/AnticipatedGameCard';
import NotFound from '../../pages/NotFound';
import defaultAvatar from '../../assets/default_avatar.png';
import usePageTitle from '../../hooks/usePageTitle';

const CollectionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { getCollectionDetails, toggleLike, getComments, addComment, deleteComment, loading } = useCollections();
    const { addGame, updateGame, deleteGame, getUserGames, userGames } = useGames();
    const gridRef = useRef(null);

    const [collection, setCollection] = useState(null);
    const [collectionGames, setCollectionGames] = useState([]);

    usePageTitle(collection?.title);
    const userGamesRef = useRef(userGames);
    useEffect(() => { userGamesRef.current = userGames; }, [userGames]);

    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isPrivateError, setIsPrivateError] = useState(false);
    const [notFound, setNotFound] = useState(false);

    // Comentarios
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12; // 3 rows of 4


    useEffect(() => {
        const fetchDetails = async () => {
            // Cargar user games en paralelo si está autenticado
            const [result, userGamesResult] = await Promise.all([
                getCollectionDetails(id),
                user ? getUserGames() : Promise.resolve({ success: false, data: [] })
            ]);

            if (result.success && result.data) {
                setCollection(result.data);

                const userGamesData = userGamesResult.success ? userGamesResult.data : [];
                userGamesRef.current = userGamesData;

                // Merge user status/rating into collection games
                if (result.data.games) {
                    const mergedGames = result.data.games.map(cg => {
                        const userGameInfo = userGamesData.find(ug => ug.igdb_game_id === cg.igdb_game_id);
                        return {
                            ...cg,
                            game_details: {
                                ...cg.game_details,
                                status: userGameInfo?.status ?? null,
                                user_rating: userGameInfo?.rating ?? 0
                            }
                        };
                    });
                    setCollectionGames(mergedGames);
                }

                setLikesCount(result.data.likes_count || 0);
                setIsLiked(result.data.user_has_liked || false);

                // Cargar comentarios
                const commentsRes = await getComments(id);
                if (commentsRes.success) {
                    setComments(commentsRes.data || []);
                }
            } else {
                if (result.error?.includes('permiso')) {
                    setIsPrivateError(true);
                } else {
                    setNotFound(true);
                }
            }
        };

        fetchDetails();
    }, [id, getCollectionDetails, getComments, navigate, user, getUserGames]);

    const totalPages = useMemo(() => {
        if (!collectionGames) return 0;
        return Math.ceil(collectionGames.length / itemsPerPage);
    }, [collectionGames]);

    const paginatedGames = useMemo(() => {
        if (!collectionGames) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return collectionGames.slice(startIndex, startIndex + itemsPerPage);
    }, [collectionGames, currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    useEffect(() => {
        if (gridRef.current && currentPage > 1) {
            gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentPage]);

    // Constante local para statuses
    const STATUS_LABELS = {
        completed: 'Completed',
        playing: 'Playing',
        wishlist: 'Wishlist',
        backlog: 'Backlog',
        dropped: 'Dropped',
    };

    const updateCollectionGame = (gameId, patch) => {
        setCollectionGames(prev => prev.map(cg => {
            if (cg.igdb_game_id === gameId) {
                return {
                    ...cg,
                    game_details: { ...cg.game_details, ...patch }
                };
            }
            return cg;
        }));
    };

    const handleWishlistToggle = useCallback(async (gameId, newStatus) => {
        if (!user) return;

        const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);

        if (newStatus === null && existingGame) {
            const result = await deleteGame(gameId);
            if (result.success) {
                toast.success('Removed from your wishlist');
                updateCollectionGame(gameId, { status: null, user_rating: 0 });
            } else {
                toast.error('Error removing from your wishlist');
            }
        } else if (newStatus === 'wishlist') {
            const result = await addGame(gameId, 'wishlist');
            if (result.success) {
                toast.success('Added to your wishlist!');
                updateCollectionGame(gameId, { status: 'wishlist', user_rating: 0 });
            } else {
                toast.error('Error adding to your wishlist');
            }
        }
    }, [user, addGame, deleteGame]); // updateCollectionGame is not a dependency if it's not wrapped in useCallback, but it's defined in the component. Actually updateCollectionGame should be wrapped too or defined inside. I'll just add it to deps for now or skip it if it doesn't change.

    const handleStatusChange = async (gameId, newStatus, currentRating = 0) => {
        if (!user) return;

        const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);
        const validRating = currentRating >= 1 && currentRating <= 5 ? currentRating : null;

        if (newStatus === null) {
            if (!existingGame) return;
            const result = await deleteGame(gameId);
            if (result.success) {
                toast.success('Game removed from your list');
                updateCollectionGame(gameId, { status: null, user_rating: 0 });
            } else {
                toast.error('Error deleting the game');
            }
            return;
        }

        if (existingGame) {
            const result = await updateGame(gameId, newStatus, validRating ?? existingGame.rating);
            if (result.success) {
                toast.success(`Status changed to "${STATUS_LABELS[newStatus] || newStatus}"`);
                updateCollectionGame(gameId, {
                    status: newStatus,
                    user_rating: validRating ?? undefined,
                });
            } else {
                toast.error('Error updating status');
            }
        } else {
            const result = await addGame(gameId, newStatus, validRating);
            if (result.success) {
                toast.success(
                    `Added as "${STATUS_LABELS[newStatus]}"! Now you can rate it`,
                    { duration: 4000 }
                );
                updateCollectionGame(gameId, { status: newStatus, user_rating: validRating ?? 0 });
            } else {
                toast.error('Error adding game');
            }
        }
    };

    const handleRatingChange = async (gameId, rating) => {
        if (!user) return;
        const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);
        if (!existingGame) {
            toast.error('First add the game to your list');
            return;
        }

        const result = await updateGame(gameId, existingGame.status, rating);
        if (result.success) {
            toast.success(`Saved rating: ${rating}`);
            updateCollectionGame(gameId, { user_rating: rating });
        } else {
            toast.error('Error saving rating');
        }
    };

    const handleToggleLike = async () => {
        if (!user) {
            toast.error('Log in to like collections');
            return;
        }

        // Optimistic update
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

        const result = await toggleLike(id);
        if (!result.success) {
            // Revert changes if API fails
            setIsLiked(isLiked);
            setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
            toast.error('Failed to update like status');
        } else {
            // Sincronizar con datos reales del backend
            setIsLiked(result.data.liked);
            setLikesCount(result.data.likes_count);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setIsSubmittingComment(true);
        const result = await addComment(id, newComment);

        if (result.success) {
            setComments([result.data, ...comments]);
            setNewComment('');
            toast.success('Comment added');
        } else {
            toast.error(result.error || 'Failed to add comment');
        }
        setIsSubmittingComment(false);
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;

        const result = await deleteComment(id, commentId);
        if (result.success) {
            setComments(comments.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
        } else {
            toast.error(result.error || 'Failed to delete comment');
        }
    };

    if (loading && !collection) {
        return (
            <div className="min-h-screen bg-primary-navy">
                <Navbar />
                <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-yellow"></div>
                </div>
            </div>
        );
    }

    if (isPrivateError) {
        return (
            <div className="min-h-screen bg-primary-navy">
                <Navbar />
                <main className="max-w-7xl mx-auto pt-32 pb-8 px-4 sm:px-6 lg:px-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back
                    </button>
                    <div className="flex flex-col items-center justify-center py-24 bg-primary-navy-dark rounded-xl border border-gray-700 shadow-lg relative overflow-hidden mt-8">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

                        <div className="relative p-5 bg-gray-800/50 rounded-full mb-6 border border-gray-700 shadow-inner">
                            <Lock className="text-purple-400" size={56} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-3 tracking-wide">Private Collection</h3>
                        <p className="text-gray-400 max-w-md text-center leading-relaxed">
                            The creator has chosen to keep this collection private.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    if (notFound) return <NotFound />;

    if (!collection) return null;

    const isOwner = user && user.id === collection.user_id;

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />
            <main className="max-w-7xl mx-auto pt-32 pb-8 px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back
                </button>

                {/* Header Section */}
                <div className="mb-14">
                    <div className="max-w-4xl">
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 text-balance">
                            {collection.title}
                        </h1>

                        <div className="flex flex-wrap items-center text-sm text-gray-400 gap-4 mb-6">
                            {isOwner ? (
                                <Link to={`/profile/${user.username}`} className="flex items-center font-medium text-gray-300 hover:text-primary-yellow transition-colors">
                                    <div className="w-5 h-5 rounded-full overflow-hidden mr-1.5 border border-gray-600 bg-primary-navy-dark">
                                        <img src={user.avatar_url ? `http://localhost:3000${user.avatar_url}` : defaultAvatar} alt={user.username} className="w-full h-full object-cover" />
                                    </div>
                                    {user.username}
                                </Link>
                            ) : (
                                <Link to={`/profile/${collection.creator_username}`} className="flex items-center font-medium text-gray-300 hover:text-primary-yellow transition-colors">
                                    <div className="w-5 h-5 rounded-full overflow-hidden mr-1.5 border border-gray-600 bg-primary-navy-dark">
                                        <img src={collection.creator_avatar_url ? `http://localhost:3000${collection.creator_avatar_url}` : defaultAvatar} alt={collection.creator_username} className="w-full h-full object-cover" />
                                    </div>
                                    {collection.creator_username}
                                </Link>
                            )}

                            <span className="text-gray-600">•</span>

                            <span>
                                {collection.games?.length || 0} Games
                            </span>

                            <span className="text-gray-600">•</span>

                            <span>
                                Updated {new Date(collection.updated_at).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3 mb-8">
                            {isOwner && (
                                <Link
                                    to={`/collections/${collection.id}/edit`}
                                    state={{ from: location.pathname }}
                                    className="flex items-center px-4 py-2 bg-gray-800/50 hover:bg-gray-700 text-white rounded-full transition-colors border border-gray-700/50 text-sm font-medium"
                                >
                                    <Edit3 size={16} className="mr-2" />
                                    Edit
                                </Link>
                            )}

                            <button
                                onClick={handleShare}
                                className="flex items-center px-4 py-2 bg-gray-800/50 hover:bg-gray-700 text-white rounded-full transition-colors border border-gray-700/50 text-sm font-medium"
                            >
                                <Share2 size={16} className="mr-2" />
                                Share
                            </button>

                            <button
                                onClick={handleToggleLike}
                                className={`flex items-center px-4 py-2 rounded-full transition-all border text-sm font-medium ${isLiked
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                    : 'bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700'
                                    }`}
                            >
                                <Heart
                                    size={16}
                                    className={`mr-2 transition-transform ${isLiked ? 'fill-current scale-110 shadow-sm' : ''}`}
                                />
                                {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
                            </button>
                        </div>

                        {collection.description && (
                            <p className="text-gray-300 text-lg leading-relaxed">
                                {collection.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Games Grid */}
                <div className="mb-12" ref={gridRef}>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <Gamepad2 className="mr-3 text-primary-yellow" />
                        Games in this Collection
                        {collectionGames && (
                            <span className="ml-3 text-sm font-normal text-gray-500">
                                ({collectionGames.length} games)
                            </span>
                        )}
                    </h2>

                    {collectionGames && collectionGames.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
                                {paginatedGames.map((cg) => {
                                    const releaseDate = cg.game_details?.first_release_date ? new Date(cg.game_details.first_release_date * 1000) : null;
                                    const isUnreleased = !releaseDate || releaseDate > new Date();

                                    const mappedGame = { ...cg.game_details, id: cg.igdb_game_id, status: cg.game_details.status, user_rating: cg.game_details.user_rating };

                                    return (
                                        <div key={cg.id} className="relative group h-full">
                                            {isUnreleased ? (
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
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-8 flex-wrap pb-8">
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
                                        {Array.from({ length: totalPages }).map((_, idx) => {
                                            const pageNum = idx + 1;
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
                    ) : (
                        <div className="bg-primary-navy-dark border border-gray-700 rounded-xl p-12 text-center">
                            <Gamepad2 size={48} className="mx-auto text-gray-600 mb-4" />
                            <h3 className="text-xl font-medium text-gray-300 mb-2">No games yet</h3>
                            <p className="text-gray-500">
                                {isOwner
                                    ? "You haven't added any games to this collection yet. Click 'Edit' to start."
                                    : "The creator hasn't added any games to this collection yet."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                <div className="bg-primary-navy-dark rounded-2xl p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-white mb-8 border-b border-gray-700 pb-4">
                        Comments ({comments.length})
                    </h2>

                    {/* Add Comment Form */}
                    {user ? (
                        <form onSubmit={handleAddComment} className="mb-10">
                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-full bg-primary-yellow overflow-hidden text-primary-navy-dark flex items-center justify-center font-bold flex-shrink-0 text-lg border border-gray-600">
                                    <img src={user.avatar_url ? `http://localhost:3000${user.avatar_url}` : defaultAvatar} alt="Avatar" className="w-full h-full object-cover bg-primary-navy-dark" />
                                </div>
                                <div className="flex-1 bg-primary-navy border border-gray-700 rounded-xl overflow-hidden focus-within:border-primary-yellow transition-colors relative flex flex-col">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="w-full bg-transparent text-white px-4 py-3 placeholder-gray-500 focus:outline-none resize-none min-h-[100px]"
                                    />
                                    <div className="bg-gray-800/50 px-4 py-2 border-t border-gray-700 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSubmittingComment || !newComment.trim()}
                                            className="px-6 py-2 bg-primary-yellow text-primary-navy-dark font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="mb-10 p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-center">
                            <p className="text-gray-400">
                                <Link to="/login" className="text-primary-yellow hover:underline">Log in</Link> to join the discussion.
                            </p>
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-6">
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-4 group">
                                    <Link to={`/profile/${comment.username}`} className="w-10 h-10 overflow-hidden rounded-full bg-gray-700 text-white flex items-center justify-center font-bold flex-shrink-0 text-lg hover:ring-2 hover:ring-primary-yellow transition-all">
                                        <img src={comment.avatar_url ? `http://localhost:3000${comment.avatar_url}` : defaultAvatar} alt="Avatar" className="w-full h-full object-cover bg-primary-navy-dark" />
                                    </Link>
                                    <div className="flex-1">
                                        <div className="bg-primary-navy border border-gray-700 rounded-xl rounded-tl-none p-4 relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <Link to={`/profile/${comment.username}`} className="font-semibold text-white hover:text-primary-yellow transition-colors mr-2">
                                                        {comment.username}
                                                    </Link>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Delete Button (Only for owner) */}
                                                {(user && user.id === comment.user_id) && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                        title="Delete comment"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default CollectionDetails;
