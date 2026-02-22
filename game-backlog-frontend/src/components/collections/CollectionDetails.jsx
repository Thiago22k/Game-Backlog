import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Heart, Share2, Trash2, Calendar, Gamepad2, User as UserIcon, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollections } from '../../hooks/useCollections';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../layout/Navbar';
import InteractiveGameCard from '../../components/games/InteractiveGameCard';

const CollectionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getCollectionDetails, toggleLike, getComments, addComment, deleteComment, loading } = useCollections();
    const gridRef = useRef(null);

    const [collection, setCollection] = useState(null);
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isPrivateError, setIsPrivateError] = useState(false);

    // Comentarios
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Usaremos 8 para colecciones (2 filas de 4) o 12 (3 filas de 4). El usuario dijo "como my games", que usa 12.


    useEffect(() => {
        const fetchDetails = async () => {
            const result = await getCollectionDetails(id);
            if (result.success && result.data) {
                setCollection(result.data);
                // Asumimos que el backend pronto mandará estos datos en el detalle
                setLikesCount(result.data.likes_count || 0);
                setIsLiked(result.data.user_has_liked || false);

                // Cargar comentarios
                const commentsRes = await getComments(id);
                if (commentsRes.success) {
                    setComments(commentsRes.data || []);
                }
            } else {
                if (result.error === 'No tienes permiso para ver esta colección' || result.error === 'Colección no encontrada o no tienes permisos' || result.error?.includes('permiso')) {
                    setIsPrivateError(true);
                } else {
                    toast.error('Could not load collection details');
                    navigate(-1);
                }
            }
        };

        fetchDetails();
    }, [id, getCollectionDetails, getComments, navigate]);

    const totalPages = useMemo(() => {
        if (!collection?.games) return 0;
        return Math.ceil(collection.games.length / itemsPerPage);
    }, [collection]);

    const paginatedGames = useMemo(() => {
        if (!collection?.games) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return collection.games.slice(startIndex, startIndex + itemsPerPage);
    }, [collection, currentPage]);

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

    const handleToggleLike = async () => {
        if (!user) {
            toast.error('You must be logged in to like a collection');
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
                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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

    if (!collection) return null;

    const isOwner = user && user.id === collection.user_id;

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
                                    <UserIcon size={16} className="mr-1.5" />
                                    {user.username}
                                </Link>
                            ) : (
                                <Link to={`/profile/${collection.creator_username}`} className="flex items-center font-medium text-gray-300 hover:text-primary-yellow transition-colors">
                                    <UserIcon size={16} className="mr-1.5" />
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
                        {collection.games && (
                            <span className="ml-3 text-sm font-normal text-gray-500">
                                ({collection.games.length} games)
                            </span>
                        )}
                    </h2>

                    {collection.games && collection.games.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
                                {paginatedGames.map((cg) => (
                                    <div key={cg.id} className="relative group">
                                        {/* Ranking Badge - Calculado basado en su posición global en la colección */}
                                        <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-yellow text-primary-navy-dark font-bold rounded-full flex items-center justify-center z-10 shadow-lg border-2 border-primary-navy shadow-black/50">
                                            {cg.sort_order + 1}
                                        </div>
                                        <InteractiveGameCard game={{ ...cg.game_details, id: cg.igdb_game_id }} interactive={false} showStatus={false} />
                                    </div>
                                ))}
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-2 mt-12 pb-8">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg bg-primary-navy-dark border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary-yellow transition-colors"
                                    >
                                        Prev
                                    </button>

                                    <div className="flex space-x-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => handlePageChange(i + 1)}
                                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${currentPage === i + 1
                                                    ? 'bg-primary-yellow text-primary-navy-dark'
                                                    : 'bg-primary-navy-dark text-gray-400 hover:text-white border border-gray-700'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg bg-primary-navy-dark border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary-yellow transition-colors"
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
                <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-white mb-8 border-b border-gray-700 pb-4">
                        Comments ({comments.length})
                    </h2>

                    {/* Add Comment Form */}
                    {user ? (
                        <form onSubmit={handleAddComment} className="mb-10">
                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-full bg-primary-yellow text-primary-navy-dark flex items-center justify-center font-bold flex-shrink-0 text-lg">
                                    {user.username.charAt(0).toUpperCase()}
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
                                    <Link to={`/profile/${comment.username}`} className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold flex-shrink-0 text-lg hover:ring-2 hover:ring-primary-yellow transition-all">
                                        {comment.username.charAt(0).toUpperCase()}
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
