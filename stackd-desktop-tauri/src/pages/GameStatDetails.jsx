import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Frown, Library } from 'lucide-react';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import { getAvatarUrl } from '../utils/avatar';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import NotFound from './NotFound';
import { getGameBanner, getGameCover } from '../utils/formatters';
import CollectionCard from '../components/collections/CollectionCard';
import ReviewPreviewCard from '../components/reviews/ReviewPreviewCard';

const STATS_INFO = {
    playing: { label: 'Playing', color: 'text-blue-400' },
    completed: { label: 'Completed', color: 'text-green-400' },
    wishlist: { label: 'Wishlist', color: 'text-cyan-400' },
    backlog: { label: 'Backlog', color: 'text-purple-400' },
    dropped: { label: 'Dropped', color: 'text-red-400' },
    likes: { label: 'Liked', color: 'text-pink-500' },
    collections: { label: 'In Collections', color: 'text-yellow-400' },
    reviews: { label: 'Reviewed', color: 'text-orange-400' },
};

const GameStatDetails = () => {
    const { slug, stat } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [game, setGame] = useState(null);
    const [users, setUsers] = useState([]);
    const [collections, setCollections] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [gameStats, setGameStats] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                // First get game details by slug
                const gameRes = await axios.get(`${ENDPOINTS.GAMES.SEARCH.replace('/search', '')}/igdb/${slug}`);
                if (!isMounted) return;

                const gameData = gameRes.data.game;
                if (!gameData) {
                    setError(true);
                    setLoading(false);
                    return;
                }
                setGame(gameData);

                // Fetch users by stat and game stats if necessary
                let collectionsRes = null;
                let reviewsRes = null;
                let usersRes = null;
                let statsRes = null;

                if (stat === 'collections') {
                    const [cRes, sRes] = await Promise.all([
                        axios.get(ENDPOINTS.COLLECTIONS.GAME_COLLECTIONS(gameData.id)),
                        axios.get(ENDPOINTS.GAMES.GAME_STATS(gameData.id))
                    ]);
                    collectionsRes = cRes;
                    statsRes = sRes;
                } else if (stat === 'reviews') {
                    reviewsRes = await axios.get(`${ENDPOINTS.REVIEWS.BY_GAME(gameData.id)}?limit=50`);
                } else {
                    usersRes = await axios.get(ENDPOINTS.GAMES.GAME_STAT_USERS(gameData.id, stat));
                }

                if (isMounted) {
                    if (stat === 'collections') {
                        setCollections(collectionsRes?.data?.collections || []);
                        setGameStats(statsRes?.data?.stats || null);
                    } else if (stat === 'reviews') {
                        const enhancedReviews = (reviewsRes?.data || []).map(r => ({
                            ...r,
                            game_name: gameData.name,
                            game_slug: slug
                        }));
                        setReviews(enhancedReviews);
                    } else {
                        setUsers(usersRes?.data?.users || []);
                    }
                }
            } catch (err) {
                console.error('Error fetching game stat users:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [slug, stat]);

    if (loading) {
        return (
            <div className="min-h-screen bg-primary-navy">
                <Navbar />
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-yellow" />
                </div>
            </div>
        );
    }

    if (error || !STATS_INFO[stat]) {
        return <NotFound />;
    }

    const statInfo = STATS_INFO[stat];
    const banner = getGameBanner(game);
    const cover = getGameCover(game);

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-gray-800">
                {banner && (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `linear-gradient(to bottom, rgba(15, 17, 26, 0.8), rgba(15, 17, 26, 1)), url(${banner})`
                        }}
                    />
                )}
                {!banner && <div className="absolute inset-0 bg-primary-navy-dark" />}

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
                    <button
                        onClick={() => navigate(`/game/${slug}`)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6 text-sm w-fit"
                    >
                        <ArrowLeft size={16} />
                        Back to Game
                    </button>

                    <div className="flex items-center gap-6">
                        <img
                            src={cover}
                            alt={game.name}
                            className="w-20 h-28 md:w-24 md:h-36 object-cover rounded-lg shadow-xl ring-1 ring-white/10"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150x200?text=No+Cover'; }}
                        />
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">
                                {game.name}
                            </h1>
                            <div className="flex items-center gap-2 text-lg">
                                {stat === 'collections' ? (
                                    <>
                                        <span className="text-gray-400">Added to</span>
                                        <span className={`font-bold uppercase tracking-wide ${statInfo.color}`}>
                                            Collections
                                        </span>
                                    </>
                                ) : stat === 'reviews' ? (
                                    <>
                                        <span className="text-gray-400">Total</span>
                                        <span className={`font-bold uppercase tracking-wide text-white`}>
                                            Reviews
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-gray-400">Users who</span>
                                        <span className={`font-bold uppercase tracking-wide ${statInfo.color}`}>
                                            {stat === 'playing' ? 'are playing' : statInfo.label}
                                        </span>
                                    </>
                                )}
                                <span className="bg-white/10 text-white text-xs font-black px-2 py-0.5 rounded-full ml-2">
                                    {stat === 'collections' ? collections.length : stat === 'reviews' ? reviews.length : users.length}
                                </span>
                            </div>

                            {stat === 'collections' && gameStats && (
                                <div className="mt-4 text-sm text-gray-400 font-medium">
                                    <p>Based on {gameStats.collectionsCount} total collections:</p>
                                    <ul className="list-disc list-inside mt-1 ml-1 space-y-0.5">
                                        <li><span className="text-white">{gameStats.collectionsPublic}</span> public collections (shown here)</li>
                                        <li><span className="text-white">{gameStats.collectionsPrivate}</span> in private collections (hidden)</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Users / Collections / Reviews Grid */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {stat === 'collections' ? (
                    collections.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {collections.map(collection => (
                                <CollectionCard
                                    key={collection.id}
                                    collection={collection}
                                    showCreator={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-primary-navy-dark rounded-2xl p-16 text-center border border-dashed border-gray-700 flex flex-col items-center">
                            <Library size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No collections found</h3>
                            <p className="text-gray-400">This game hasn't been added to any public collections yet.</p>
                        </div>
                    )
                ) : stat === 'reviews' ? (
                    reviews.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {reviews.map(review => (
                                <ReviewPreviewCard
                                    key={review.id}
                                    review={review}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-primary-navy-dark rounded-2xl p-16 text-center border border-dashed border-gray-700 flex flex-col items-center">
                            <Frown size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No reviews found</h3>
                            <p className="text-gray-400">No one has reviewed this game yet.</p>
                        </div>
                    )
                ) : (
                    users.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {users.map((user) => (
                                <Link
                                    key={user.id}
                                    to={`/profile/${user.username}`}
                                    className="bg-primary-navy-dark rounded-xl p-4 flex flex-col items-center gap-3 hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 group"
                                >
                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 ring-2 ring-transparent group-hover:ring-primary-yellow transition-all">
                                        {user.avatar_url ? (
                                            <img src={getAvatarUrl(user)} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl uppercase">
                                                {user.username.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center w-full">
                                        <p className="text-white font-semibold text-sm truncate group-hover:text-primary-yellow transition-colors">
                                            {user.username}
                                        </p>
                                        {user.stat_date && (
                                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                                                {new Date(user.stat_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-primary-navy-dark rounded-2xl p-16 text-center border border-dashed border-gray-700 flex flex-col items-center">
                            <Frown size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No users found</h3>
                            <p className="text-gray-400">No one has {statInfo.label.toLowerCase()} this game yet.</p>
                        </div>
                    )
                )}
            </div>

            <Footer />
        </div>
    );
};

export default GameStatDetails;
