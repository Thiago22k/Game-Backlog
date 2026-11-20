import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, PlayingCardsFan, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCollections } from '../../hooks/useCollections';
import CollectionCard from '../../components/collections/CollectionCard';
import CustomSelect from '../../components/common/CustomSelect';

const ProfileCollections = () => {
    const { username } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isOwner } = useOutletContext();
    const { collections, loading, getUserCollections } = useCollections();

    // Filtros y ordenamiento
    const [sortBy, setSortBy] = useState('recent');
    const [visibilityFilter, setVisibilityFilter] = useState('all');

    useEffect(() => {
        if (username) {
            getUserCollections(username);
        }
    }, [username, getUserCollections]);

    // Procesar colecciones (Filtrar y Ordenar)
    const processedCollections = useMemo(() => {
        let result = [...collections];

        // 1. Filtrar por visibilidad (solo si es el dueño)
        if (isOwner && visibilityFilter !== 'all') {
            const isPublic = visibilityFilter === 'public';
            result = result.filter(c => c.is_public === isPublic);
        }

        // 2. Ordenar
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
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }

        return result;
    }, [collections, sortBy, visibilityFilter, isOwner]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <PlayingCardsFan size={24} className="text-primary-yellow" />
                    Collections
                    {!loading && collections.length > 0 && (
                        <span className="text-sm font-normal text-gray-400">
                            ({processedCollections.length})
                        </span>
                    )}
                </h3>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {isOwner && (
                        <button
                            onClick={() => navigate('/collections/new')}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-yellow text-primary-navy-dark rounded-lg hover:opacity-90 font-semibold transition-all whitespace-nowrap cursor-pointer"
                        >
                            <Plus size={18} />
                            New Collection
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros y Sort - Estilo igual a ProfileGames */}
            {collections.length > 0 && (
                <div className="mb-8 space-y-4">
                    {/* Visibility filter (Solo para el dueño) */}
                    {isOwner && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-gray-400 text-sm self-center mr-2">Visibility:</span>
                            {[
                                { value: 'all', label: 'All', Icon: PlayingCardsFan },
                                { value: 'public', label: 'Public', Icon: Eye },
                                { value: 'private', label: 'Private', Icon: EyeOff },
                            ].map(filter => (
                                <button
                                    key={filter.value}
                                    onClick={() => setVisibilityFilter(filter.value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer  ${visibilityFilter === filter.value
                                        ? 'bg-primary-yellow text-primary-navy-dark'
                                        : 'bg-primary-navy-dark text-gray-400 hover:text-white hover:bg-primary-navy-light'
                                        }`}
                                >
                                    <filter.Icon size={14} />
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Sort Options */}
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Sort by:</span>
                            <CustomSelect
                                options={[
                                    { value: 'recent', label: 'Recently Created' },
                                    { value: 'likes', label: 'Most Liked' },
                                    { value: 'comments', label: 'Most Commented' },
                                    { value: 'games-high', label: 'Games (High-Low)' },
                                    { value: 'games-low', label: 'Games (Low-High)' },
                                ]}
                                value={sortBy}
                                onChange={setSortBy}
                                className="cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {collections.length === 0 ? (
                <div className="text-center py-16 bg-primary-navy-dark rounded-xl">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-primary-navy rounded-full">
                            <PlayingCardsFan size={32} className="text-gray-500" />
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
            ) : processedCollections.length === 0 ? (
                <div className="text-center py-16 bg-primary-navy-dark rounded-xl">
                    <p className="text-gray-400">
                        No collections match your filters.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {processedCollections.map(collection => (
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
