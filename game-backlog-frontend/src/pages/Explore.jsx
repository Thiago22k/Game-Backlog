import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import GameCard from '../components/games/GameCard';
import ExploreFilters from '../components/games/ExploreFilters';

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addGame } = useGames();

  // Leer parámetros de URL
  const getParamArray = (key) => {
    const value = searchParams.get(key);
    return value ? value.split(',').map(Number) : [];
  };

  // Estados de búsqueda
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(!!searchParams.get('search'));
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Estados de exploración con filtros (leídos de URL)
  const [exploreGames, setExploreGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros (leídos de URL)
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [selectedTimeRange, setSelectedTimeRange] = useState(searchParams.get('timeRange') || null);
  const [selectedGenres, setSelectedGenres] = useState(getParamArray('genres'));
  const [selectedPlatforms, setSelectedPlatforms] = useState(getParamArray('platforms'));

  // Datos de filtros
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);

  // Modal de agregar juego
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [addStatus, setAddStatus] = useState('completed');
  const [addRating, setAddRating] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Cargar géneros y plataformas al inicio
  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        const [genresRes, platformsRes] = await Promise.all([
          axios.get(ENDPOINTS.GAMES.GENRES),
          axios.get(ENDPOINTS.GAMES.PLATFORMS)
        ]);

        setAvailableGenres(genresRes.data.genres);
        setAvailablePlatforms(platformsRes.data.platforms);
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };

    fetchFiltersData();
  }, []);

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery && isSearching) {
      params.set('search', searchQuery);
    } else {
      if (sortBy !== 'relevance') params.set('sort', sortBy);
      if (selectedTimeRange) params.set('timeRange', selectedTimeRange);
      if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
      if (selectedPlatforms.length > 0) params.set('platforms', selectedPlatforms.join(','));
    }

    setSearchParams(params, { replace: true });
  }, [sortBy, selectedTimeRange, selectedGenres, selectedPlatforms, searchQuery, isSearching]);

  // Modificar el useEffect que carga juegos:
useEffect(() => {
  const fetchExploreGames = async () => {
    setLoading(true);
    try {
      if (isSearching && searchQuery) {
        const response = await axios.get(`${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response.data.games);
        setHasMore(false); // Search no tiene paginación
      } else {
        const params = new URLSearchParams();
        params.append('sort', sortBy);
        if (selectedTimeRange) params.append('timeRange', selectedTimeRange);
        if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
        if (selectedPlatforms.length > 0) params.append('platforms', selectedPlatforms.join(','));
        params.append('limit', '20');
        params.append('offset', offset.toString());

        const response = await axios.get(`${ENDPOINTS.GAMES.EXPLORE}?${params.toString()}`);
        
        if (offset === 0) {
          // Primera carga: reemplazar juegos
          setExploreGames(response.data.games);
        } else {
          // Carga adicional: agregar al final
          setExploreGames(prev => [...prev, ...response.data.games]);
        }

        // Si recibió menos de 20, no hay más
        setHasMore(response.data.games.length === 20);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  fetchExploreGames();
}, [sortBy, selectedTimeRange, selectedGenres, selectedPlatforms, searchQuery, isSearching, offset]);

  const handleLoadMore = () => {
  setOffset(prev => prev + 20);
  };

  // Resetear offset cuando cambian los filtros
useEffect(() => {
  setOffset(0);
  setHasMore(true);
}, [sortBy, selectedTimeRange, selectedGenres, selectedPlatforms]);

  // Buscar juegos
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Limpiar filtros
  const handleClearFilters = () => {
  setSelectedTimeRange(null);
  setSelectedGenres([]);
  setSelectedPlatforms([]);
  setSortBy('relevance');
  setOffset(0); // ← Agregar esto
  setHasMore(true); // ← Agregar esto
};

  // Abrir modal para agregar
  const handleAddClick = (game) => {
    if (!isAuthenticated) {
      localStorage.setItem('redirectAfterLogin', `/game/${game.id}`);
      navigate('/login');
      return;
    }

    setSelectedGame(game);
    setShowAddModal(true);
    setAddError('');
    setAddSuccess('');
  };

  // Agregar juego a la lista
  const handleAddGame = async () => {
    setAddLoading(true);
    setAddError('');

    const result = await addGame(selectedGame.id, addStatus, addRating);

    if (result.success) {
      setAddSuccess('Game added successfully');
      setTimeout(() => {
        setShowAddModal(false);
        setAddStatus('completed');
        setAddRating(null);
        setAddSuccess('');
      }, 1500);
    } else {
      setAddError(result.error);
    }

    setAddLoading(false);
  };

  const gamesToDisplay = isSearching ? searchResults : exploreGames;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Explore Games</h1>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex space-x-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Search
            </button>
            {isSearching && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Layout: Filters + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar with filters */}
          {!isSearching && (
            <div className="lg:col-span-1">
              <ExploreFilters
                selectedTimeRange={selectedTimeRange}
                setSelectedTimeRange={setSelectedTimeRange}
                selectedGenres={selectedGenres}
                setSelectedGenres={setSelectedGenres}
                selectedPlatforms={selectedPlatforms}
                setSelectedPlatforms={setSelectedPlatforms}
                availableGenres={availableGenres}
                availablePlatforms={availablePlatforms}
                onClear={handleClearFilters}
              />
            </div>
          )}

          {/* Games grid */}
          <div className={isSearching ? 'lg:col-span-4' : 'lg:col-span-3'}>
            
            {/* Sorting */}
            {!isSearching && (
              <div className="mb-6 flex justify-between items-center">
                <p className="text-gray-600">
                  {exploreGames.length} game(s) found
                </p>
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">
                    Sort by:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="popular">Most Popular</option>
                    <option value="rating">Best Rated</option>
                    <option value="recent">Most Recent</option>
                    <option value="alphabetical">Alphabetical (A-Z)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading games...</p>
              </div>
            )}

            {/* No results */}
            {!loading && gamesToDisplay.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">
                  {isSearching 
                    ? 'No games found. Try another search.' 
                    : 'No games match the selected filters.'}
                </p>
              </div>
            )}

            {/* Games grid */}
            {!loading && gamesToDisplay.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {gamesToDisplay.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onAdd={handleAddClick}
                  />
                ))}
              </div>
            )}

            {/* Load More button */}
    {!isSearching && hasMore && (
      <div className="mt-8 text-center">
        <button
          onClick={handleLoadMore}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Load More
        </button>
      </div>
    )}

    {!isSearching && !hasMore && exploreGames.length > 0 && (
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">No more games to load</p>
      </div>
    )}

          </div>

        </div>
      </main>

      {/* Add game modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add "{selectedGame?.name}" to your list
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="completed">Completed</option>
                <option value="playing">Playing</option>
                <option value="wishlist">Wishlist</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <select
                value={addRating || ''}
                onChange={(e) => setAddRating(e.target.value ? parseInt(e.target.value) : null)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">No rating</option>
                <option value="1">⭐ 1</option>
                <option value="2">⭐⭐ 2</option>
                <option value="3">⭐⭐⭐ 3</option>
                <option value="4">⭐⭐⭐⭐ 4</option>
                <option value="5">⭐⭐⭐⭐⭐ 5</option>
              </select>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {addError}
              </div>
            )}

            {addSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {addSuccess}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddStatus('completed');
                  setAddRating(null);
                  setAddError('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                disabled={addLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddGame}
                disabled={addLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;