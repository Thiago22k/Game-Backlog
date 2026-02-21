import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Library } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCollections } from '../../hooks/useCollections';
import CollectionCard from '../../components/collections/CollectionCard';

const ProfileCollections = () => {
    const { username } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { collections, loading, getUserCollections } = useCollections();

    const isOwner = user?.username === username;

    useEffect(() => {
        if (username) {
            getUserCollections(username);
        }
    }, [username, getUserCollections]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Library size={24} className="text-primary-yellow" />
                    Collections
                </h3>

                {isOwner && (
                    <button
                        onClick={() => navigate('/collections/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-yellow text-primary-navy-dark rounded-lg hover:opacity-90 font-semibold transition-all"
                    >
                        <Plus size={18} />
                        New Collection
                    </button>
                )}
            </div>

            {collections.length === 0 ? (
                <div className="text-center py-16 bg-primary-navy-dark border border-gray-700 rounded-xl">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-primary-navy rounded-full">
                            <Library size={32} className="text-gray-500" />
                        </div>
                    </div>
                    <p className="text-gray-400 mb-6">
                        {isOwner
                            ? "You haven't created any collections yet."
                            : "This user doesn't have any public collections."}
                    </p>
                    {isOwner && (
                        <button
                            onClick={() => navigate('/collections/new')}
                            className="px-6 py-2 bg-primary-yellow text-primary-navy-dark rounded-lg font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2"
                        >
                            <Plus size={18} /> Create your first collection
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {collections.map(collection => (
                        <CollectionCard
                            key={collection.id}
                            collection={collection}
                            isOwner={isOwner}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProfileCollections;
