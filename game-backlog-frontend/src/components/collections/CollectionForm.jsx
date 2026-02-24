import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { Search, Plus, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollections } from '../../hooks/useCollections';
import axios from '../../api/axios';
import { getGameCover, PLACEHOLDER_COVER } from '../../utils/formatters';
import Navbar from '../layout/Navbar';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = {
    0: 'Main Game',
    1: 'DLC / Addon',
    2: 'Expansion',
    3: 'Bundle',
    4: 'Standalone Expansion',
    5: 'Mod',
    6: 'Episode',
    7: 'Season',
    8: 'Remake',
    9: 'Remaster',
    10: 'Expanded Game',
    11: 'Port',
    12: 'Fork',
    13: 'Pack',
    14: 'Update'
};

const CollectionForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditing = !!id;

    // Define adónde enviar al usuario tras crear, editar o eliminar
    const from = location.state?.from || `/profile/${user?.username}/collections`;

    const { createCollection, updateCollection, getCollectionDetails, deleteCollection, loading: saving } = useCollections();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [selectedGames, setSelectedGames] = useState([]);

    // Cargar datos si es edición
    useEffect(() => {
        if (isEditing) {
            const fetchCollection = async () => {
                const result = await getCollectionDetails(id);
                if (result.success) {
                    setTitle(result.data.title);
                    setDescription(result.data.description || '');
                    setIsPublic(result.data.is_public);

                    if (result.data.games) {
                        const mappedGames = result.data.games.map(g => ({
                            ...g.game_details,
                            igdb_game_id: g.igdb_game_id
                        }));
                        setSelectedGames(mappedGames);
                    }
                } else {
                    toast.error('Could not load collection');
                    navigate(-1);
                }
            };
            fetchCollection();
        }
    }, [isEditing, id, getCollectionDetails, navigate]);

    // Manejo de búsqueda usando debounce simple
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const response = await axios.get(`/games/search?query=${encodeURIComponent(searchQuery)}`);
                    setSearchResults(response.data.games);
                } catch (error) {
                    console.error('Search error:', error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddGame = (game) => {
        if (selectedGames.some(g => (g.id || g.igdb_game_id) === game.id)) {
            toast.error('Game already in collection');
            return;
        }
        setSelectedGames([...selectedGames, { ...game, igdb_game_id: game.id }]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemoveGame = (gameId) => {
        setSelectedGames(selectedGames.filter(g => (g.id || g.igdb_game_id) !== gameId));
    };

    // Funciones simples para mover arriba/abajo (reemplazo simple de drag and drop)
    const moveGameUp = (index) => {
        if (index === 0) return;
        const newGames = [...selectedGames];
        [newGames[index - 1], newGames[index]] = [newGames[index], newGames[index - 1]];
        setSelectedGames(newGames);
    };

    const moveGameDown = (index) => {
        if (index === selectedGames.length - 1) return;
        const newGames = [...selectedGames];
        [newGames[index + 1], newGames[index]] = [newGames[index], newGames[index + 1]];
        setSelectedGames(newGames);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        const payload = {
            title,
            description,
            is_public: isPublic,
            games: selectedGames.map((g, idx) => ({ igdb_game_id: g.id || g.igdb_game_id, sort_order: idx }))
        };

        let result;
        if (isEditing) {
            result = await updateCollection(id, payload);
        } else {
            result = await createCollection(payload);
        }

        if (result.success) {
            toast.success(`Collection ${isEditing ? 'updated' : 'created'} successfully!`);
            navigate(from);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
            const result = await deleteCollection(id);
            if (result.success) {
                toast.success('Collection deleted successfully');
                // Si la eliminamos y el "from" era sus detalles, saltaría error 404. Así que la vista normal
                const isFromDetails = from.includes(id);
                navigate(isFromDetails ? `/profile/${user?.username}/collections` : from);
            } else {
                toast.error(result.error || 'Failed to delete collection');
            }
        }
    };

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />
            <main className="max-w-4xl mx-auto pt-32 pb-8 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back
                </button>

                <h1 className="text-3xl font-bold text-white mb-8">
                    {isEditing ? 'Edit Collection' : 'Create New Collection'}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* General Info */}
                    <div className="bg-primary-navy-dark rounded-xl p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-white mb-4">General Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="E.g., Top 10 Horror Games"
                                className="w-full px-4 py-2 bg-primary-navy border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-yellow"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Give your collection a description..."
                                className="w-full px-4 py-2 bg-primary-navy border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-yellow resize-none"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="w-4 h-4 rounded bg-primary-navy border-gray-700 text-primary-yellow focus:ring-primary-yellow focus:ring-offset-primary-navy-dark"
                            />
                            <label htmlFor="isPublic" className="ml-2 text-sm text-gray-300">
                                Make this collection public
                            </label>
                        </div>
                    </div>

                    {/* Games Selection */}
                    <div className="bg-primary-navy-dark rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Games</h2>

                        {/* Search Input */}
                        <div className="relative mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search and add games..."
                                    className="w-full pl-10 pr-4 py-3 bg-primary-navy border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-yellow"
                                />
                            </div>

                            {/* Search Results Dropdown */}
                            {searchQuery.trim().length > 2 && (
                                <div className="absolute z-10 w-full mt-1 bg-primary-navy border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-gray-400">Searching...</div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map(game => (
                                            <div
                                                key={game.id}
                                                onClick={() => handleAddGame(game)}
                                                className="flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-0"
                                            >
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-medium">{game.name}</span>
                                                        {(game.game_type === 0 || game.game_type === undefined) ? (
                                                            <span className="px-1.5 py-0.5 bg-gray-800/80 text-gray-400 text-[10px] uppercase tracking-wider font-bold rounded border border-gray-700 leading-none">
                                                                Main Game
                                                            </span>
                                                        ) : (
                                                            CATEGORIES[game.game_type] && (
                                                                <span className="px-1.5 py-0.5 bg-gray-800/80 text-gray-400 text-[10px] uppercase tracking-wider font-bold rounded border border-gray-700 leading-none">
                                                                    {CATEGORIES[game.game_type]}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : 'TBA'}
                                                    </span>
                                                </div>
                                                <Plus size={18} className="text-gray-400 hover:text-primary-yellow" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-400">No games found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Games List */}
                        <div className="space-y-3">
                            {selectedGames.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                                    No games added yet. Search above to add games to your collection.
                                </div>
                            ) : (
                                selectedGames.map((game, index) => (
                                    <div key={game.id || game.igdb_game_id} className="flex items-center bg-primary-navy p-3 rounded-lg border border-gray-700 group">
                                        <div className="flex flex-col mr-3 text-gray-600">
                                            <button type="button" onClick={() => moveGameUp(index)} disabled={index === 0} className="hover:text-primary-yellow disabled:opacity-20">▲</button>
                                            <button type="button" onClick={() => moveGameDown(index)} disabled={index === selectedGames.length - 1} className="hover:text-primary-yellow disabled:opacity-20">▼</button>
                                        </div>

                                        <div className="w-12 h-16 bg-gray-800 rounded overflow-hidden flex-shrink-0 mr-4">
                                            <img
                                                src={getGameCover(game)}
                                                alt={game.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = PLACEHOLDER_COVER;
                                                }}
                                            />
                                        </div>

                                        <div className="flex-grow">
                                            <h4 className="text-white font-medium">{game.name}</h4>
                                            <p className="text-sm text-gray-400">
                                                {game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : 'TBA'}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveGame(game.id || game.igdb_game_id)}
                                            className="p-2 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove game"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4 text-sm text-gray-400">
                            Total games: {selectedGames.length}
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700">
                        <div>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center disabled:opacity-50"
                                >
                                    <Trash2 size={18} className="mr-2" />
                                    Delete Collection
                                </button>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(from)}
                                className="px-6 py-2 bg-transparent border border-gray-600 text-white rounded-lg hover:border-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-primary-yellow text-primary-navy-dark font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Collection'}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CollectionForm;
