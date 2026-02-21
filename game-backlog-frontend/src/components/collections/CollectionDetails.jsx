import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Heart, Share2, Trash2, Calendar, Gamepad2, User as UserIcon } from 'lucide-react';
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

    const [collection, setCollection] = useState(null);
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    // Comentarios
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
                toast.error('Could not load collection details');
                navigate(-1);
            }
        };

        fetchDetails();
    }, [id, getCollectionDetails, getComments, navigate]);

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
                <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
                    {/* Background effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-yellow/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
                        <div className="flex-1">
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                                {collection.title}
                            </h1>

                            {collection.description && (
                                <p className="text-gray-300 text-lg mb-6 max-w-3xl">
                                    {collection.description}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center text-sm text-gray-400 gap-6">
                                {/* Todavía no tenemos el username real del creador explícito en getCollectionDetails, asumiendo "Creator" por ahora si no es el dueño */}
                                {isOwner ? (
                                    <Link to={`/profile/${user.username}`} className="flex items-center hover:text-primary-yellow transition-colors">
                                        <UserIcon size={16} className="mr-2" />
                                        By {user.username}
                                    </Link>
                                ) : (
                                    <Link to={`/profile/${collection.creator_username}`} className="flex items-center hover:text-primary-yellow transition-colors">
                                        <UserIcon size={16} className="mr-2" />
                                        By {collection.creator_username}
                                    </Link>
                                )}

                                <span className="flex items-center">
                                    <Gamepad2 size={16} className="mr-2" />
                                    {collection.games?.length || 0} Games
                                </span>

                                <span className="flex items-center">
                                    <Calendar size={16} className="mr-2" />
                                    Updated {new Date(collection.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                            {isOwner && (
                                <Link
                                    to={`/collections/${collection.id}/edit`}
                                    className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
                                >
                                    <Edit3 size={18} className="mr-2" />
                                    Edit
                                </Link>
                            )}

                            <button
                                onClick={handleShare}
                                className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
                            >
                                <Share2 size={18} className="mr-2" />
                                Share
                            </button>

                            <button
                                onClick={handleToggleLike}
                                className={`flex items-center px-4 py-2 rounded-lg transition-all border ${isLiked
                                    ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20'
                                    : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                                    }`}
                            >
                                <Heart
                                    size={18}
                                    className={`mr-2 transition-transform ${isLiked ? 'fill-current scale-110' : ''}`}
                                />
                                {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Games Grid */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <Gamepad2 className="mr-3 text-primary-yellow" />
                        Games in this Collection
                    </h2>

                    {collection.games && collection.games.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {collection.games.map((cg) => (
                                <div key={cg.id} className="relative group">
                                    {/* Ranking Badge */}
                                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-yellow text-primary-navy-dark font-bold rounded-full flex items-center justify-center z-10 shadow-lg border-2 border-primary-navy shadow-black/50">
                                        {cg.sort_order + 1}
                                    </div>
                                    <InteractiveGameCard game={{ ...cg.game_details, id: cg.igdb_game_id }} interactive={false} showStatus={false} />
                                </div>
                            ))}
                        </div>
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
