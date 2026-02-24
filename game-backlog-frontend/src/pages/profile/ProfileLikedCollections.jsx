import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Library, ChevronDown, ArrowLeft } from 'lucide-react';
import CollectionCard from '../../components/collections/CollectionCard';
import axios from '../../api/axios';

const PAGE_SIZE = 20;

const ProfileLikedCollections = () => {
    const { username } = useParams();

    const [allCollections, setAllCollections] = useState([]);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);

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

    const visibleCollections = allCollections.slice(0, visibleCount);
    const hasMore = visibleCount < allCollections.length;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Library size={20} className="text-primary-yellow" />
                    Liked Collections
                    {!loading && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                            ({allCollections.length})
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
                                Load more ({allCollections.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProfileLikedCollections;
