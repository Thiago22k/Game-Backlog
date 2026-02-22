import { useState, useEffect } from 'react';
import { X, Plus, FolderPlus, Library, Lock, Check } from 'lucide-react';
import { useCollections } from '../../hooks/useCollections';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AddToCollectionModal = ({ isOpen, onClose, game }) => {
    const { user } = useAuth();
    const { getUserCollections, addGameToCollection, checkGameInCollections, createCollection, loading } = useCollections();

    const [collections, setCollections] = useState([]);
    const [collectionsWithGame, setCollectionsWithGame] = useState(new Set());
    const [isCreating, setIsCreating] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    // Formulario Nueva Colección
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newIsPublic, setNewIsPublic] = useState(true);

    useEffect(() => {
        if (isOpen && user && game) {
            fetchData();
        }
    }, [isOpen, user, game]);

    const fetchData = async () => {
        setIsFetching(true);
        // Obtener las colecciones del usuario y las IDs donde ya está el juego en paralelo
        const [colRes, containsRes] = await Promise.all([
            getUserCollections(user.username, false), // false para no mostrar loader global
            checkGameInCollections(game.id || game.igdb_game_id)
        ]);

        if (colRes.success) {
            // Sort by recently updated
            setCollections(colRes.data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
        }
        if (containsRes.success) {
            setCollectionsWithGame(new Set(containsRes.data));
        }
        setIsFetching(false);
    };

    const handleAddToCollection = async (collectionId) => {
        const result = await addGameToCollection(collectionId, game.id || game.igdb_game_id);

        if (result.success) {
            toast.success(`"${game.name}" added to collection!`);
            // Update local state to show it was added without refetching everything
            setCollectionsWithGame(prev => new Set([...prev, collectionId]));
        } else {
            toast.error(result.error || 'Failed to add game to collection');
        }
    };

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) {
            toast.error('Please enter a title');
            return;
        }

        // Crear colección y pasarle el juego inicial
        const collectionData = {
            title: newTitle.trim(),
            description: newDescription.trim(),
            is_public: newIsPublic,
            games: [{ igdb_game_id: game.id || game.igdb_game_id }]
        };

        const result = await createCollection(collectionData);

        if (result.success) {
            toast.success('Collection created and game added!');
            // Refrescar y cerrar o volver a la vista de lista
            await fetchData();
            setIsCreating(false);
            setNewTitle('');
            setNewDescription('');
            setNewIsPublic(true);
        } else {
            toast.error(result.error || 'Failed to create collection');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-primary-navy-dark/95 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
            <div className="bg-primary-navy border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-gray-800/20">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <FolderPlus className="mr-2 text-primary-yellow" size={24} />
                            Add to Collection
                        </h2>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-1 break-all">
                            {game?.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {isFetching ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow"></div>
                        </div>
                    ) : isCreating ? (
                        <form onSubmit={handleCreateCollection} className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="E.g., Masterpieces, Co-op games..."
                                    className="w-full px-4 py-2 bg-primary-navy-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-yellow transition-colors"
                                    required
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Description <span className="text-gray-500">(Optional)</span>
                                </label>
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="What is this collection about?"
                                    className="w-full px-4 py-2 bg-primary-navy-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-yellow transition-colors resize-none h-24"
                                    maxLength={500}
                                />
                            </div>

                            <div className="flex items-center space-x-3 p-3 bg-primary-navy-dark rounded-lg border border-gray-700">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newIsPublic}
                                        onChange={(e) => setNewIsPublic(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-yellow"></div>
                                </label>
                                <div>
                                    <p className="text-sm font-medium text-white flex items-center">
                                        {newIsPublic ? 'Public Collection' : <><Lock className="mr-1.5" size={14} /> Private Collection</>}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {newIsPublic ? 'Anyone can see your collection' : 'Only you can see this collection'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 px-4 bg-primary-yellow text-primary-navy-dark font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create & Add'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:text-primary-yellow hover:border-primary-yellow hover:bg-gray-800/30 transition-all group"
                            >
                                <div className="p-1.5 bg-gray-800 group-hover:bg-primary-yellow/10 rounded-full transition-colors">
                                    <Plus size={18} />
                                </div>
                                <span className="font-medium">Create New Collection</span>
                            </button>

                            {collections.length > 0 ? (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 px-1 mt-6">
                                        Your Collections
                                    </h3>
                                    {collections.map(collection => {
                                        const alreadyAdded = collectionsWithGame.has(collection.id);

                                        return (
                                            <div
                                                key={collection.id}
                                                className="flex items-center justify-between p-3 bg-primary-navy-dark border border-gray-700 rounded-xl hover:border-gray-600 transition-colors"
                                            >
                                                <div className="flex items-center overflow-hidden mr-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-400 mr-3">
                                                        <Library size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-white font-medium truncate">{collection.title}</h4>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                                            {collection.game_count || 0} games • {collection.is_public ? 'Public' : 'Private'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleAddToCollection(collection.id)}
                                                    disabled={alreadyAdded || loading}
                                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 flex items-center ${alreadyAdded
                                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                                            : 'bg-primary-yellow/10 text-primary-yellow hover:bg-primary-yellow hover:text-primary-navy-dark border border-primary-yellow/20'
                                                        }`}
                                                >
                                                    {alreadyAdded ? (
                                                        <><Check size={14} className="mr-1.5" /> Added</>
                                                    ) : (
                                                        'Add'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Library className="mx-auto text-gray-600 mb-3" size={32} />
                                    <p className="text-gray-400">You don't have any collections yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddToCollectionModal;
