import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Library, ChevronDown, ArrowLeft } from 'lucide-react';
import CollectionCard from '../../components/collections/CollectionCard';
import axios from '../../api/axios';
import usePageTitle from '../../hooks/usePageTitle';

const PAGE_SIZE = 20;

const ProfileLikedCollections = () => {
    const { username } = useParams();

    const [allCollections, setAllCollections] = useState([]);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('recent');

    usePageTitle(`${username}'s Liked Collections`);

    useEffect(() => {
        if (!username) return;
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/collections/liked/user/${username}`);
                setAllCollections(res.data.collections || []);
            } catch {
                setAllCollections([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [username]);

    // Ordenar colecciones
    const sortedCollections = useMemo(() => {
        let result = [...allCollections];

        switch (sortBy) {
            case 'likes':
                result.sort((a, b) => (parseInt(b.likes_count) || 0) - (parseInt(a.likes_count) || 0));
                break;
            case 'comments':
                result.sort((a, b) => (parseInt(b.comments_count) || 0) - (parseInt(a.comments_count) || 0));
                break;
            case 'games-high':
                result.sort((a, b) => (parseInt(b.game_count) || 0) - (parseInt(a.game_count) || 0));
                break;
            case 'games-low':
                result.sort((a, b) => (parseInt(a.game_count) || 0) - (parseInt(b.game_count) || 0));
                break;
            case 'recent':
            default:
                // El servidor ya las devuelve por fecha de like descendente para 'recent'
                break;
        }

        return result;
    }, [allCollections, sortBy]);

    const visibleCollections = sortedCollections.slice(0, visibleCount);
    const hasMore = visibleCount < sortedCollections.length;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Library size={20} className="text-primary-yellow" />
                    Liked Collections
                    {!loading && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                            ({sortedCollections.length})
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

            {/* Sort Controls - Estilo igual a ProfileCollections/Games */}
            {!loading && allCollections.length > 0 && (
                <div className="mb-8 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setVisibleCount(PAGE_SIZE);
                            }}
                            className="bg-primary-navy-dark text-white rounded-lg px-4 py-2 text-sm focus:outline-none border border-gray-700 focus:border-primary-yellow transition-colors cursor-pointer"
                        >
                            <option value="recent">Recently Liked</option>
                            <option value="likes">Most Liked</option>
                            <option value="comments">Most Commented</option>
                            <option value="games-high">Games (High-Low)</option>
                            <option value="games-low">Games (Low-High)</option>
                        </select>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </div>
            ) : allCollections.length === 0 ? (
                <div className="text-center py-14 bg-primary-navy-dark border border-gray-700 rounded-xl">
                    <Library size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No liked collections yet.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {visibleCollections.map(collection => (
                            <CollectionCard
                                key={collection.id}
                                collection={collection}
                                isOwner={false}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center mt-10">
                            <button
                                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary-navy-dark border border-gray-700 hover:border-primary-yellow text-white hover:text-primary-yellow rounded-full font-medium transition-all text-sm"
                            >
                                <ChevronDown size={16} />
                                Load more ({sortedCollections.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProfileLikedCollections;
