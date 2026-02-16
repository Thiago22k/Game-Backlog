import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import GameCard from '../components/games/GameCard';
import ExploreFilters from '../components/games/ExploreFilters';

const Explore = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addGame } = useGames();

  // Estados de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Estados de exploración con filtros
  const [exploreGames, setExploreGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedTimeRange, setSelectedTimeRange] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

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
        console.error('Error cargando filtros:', error);
      }
    };

    fetchFiltersData();
  }, []);

  // Cargar juegos con filtros
  useEffect(() => {
  const fetchExploreGames = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('sort', sortBy);
      if (selectedTimeRange) params.append('timeRange', selectedTimeRange); // ← Cambio aquí
      if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
      if (selectedPlatforms.length > 0) params.append('platforms', selectedPlatforms.join(','));
      params.append('limit', '20');

      const response = await axios.get(`${ENDPOINTS.GAMES.EXPLORE}?${params.toString()}`);
      setExploreGames(response.data.games);
    } catch (error) {
      console.error('Error cargando juegos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSearching) {
    fetchExploreGames();
  }
}, [sortBy, selectedTimeRange, selectedGenres, selectedPlatforms, isSearching]);

  // Buscar juegos
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    setLoading(true);
    setIsSearching(true);

    try {
      const response = await axios.get(`${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.games);
    } catch (error) {
      console.error('Error buscando:', error);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Limpiar filtros
  const handleClearFilters = () => {
  setSelectedTimeRange(null); // ← Cambio aquí
  setSelectedGenres([]);
  setSelectedPlatforms([]);
  setSortBy('relevance'); // ← Cambio aquí
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
      setAddSuccess('Juego agregado exitosamente');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Explorar juegos</h1>

        {/* Barra de búsqueda */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex space-x-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar juegos..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Buscar
            </button>
            {isSearching && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
              >
                Limpiar
              </button>
            )}
          </div>
        </form>

        {/* Layout: Filtros + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar con filtros (solo visible si NO está buscando) */}
          {!isSearching && (
            <div className="lg:col-span-1">
              <ExploreFilters
                selectedTimeRange={selectedTimeRange} // ← Cambio aquí
                setSelectedTimeRange={setSelectedTimeRange} // ← Cambio aquí
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

          {/* Grid de juegos */}
          <div className={isSearching ? 'lg:col-span-4' : 'lg:col-span-3'}>
            
            {/* Ordenamiento (solo visible si NO está buscando) */}
            {!isSearching && (
              <div className="mb-6 flex justify-between items-center">
                <p className="text-gray-600">
                  {exploreGames.length} juego(s) encontrado(s)
                </p>
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">
                    Ordenar por:
                  </label>
                  <select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
>
  <option value="relevance">Relevancia</option> {/* ← Nuevo */}
  <option value="popular">Más populares</option>
  <option value="rating">Mejor puntuados</option>
  <option value="recent">Más recientes</option>
  <option value="alphabetical">Alfabético (A-Z)</option>
</select>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-12">
                <p className="text-gray-600">Cargando juegos...</p>
              </div>
            )}

            {/* Sin resultados */}
            {!loading && gamesToDisplay.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">
                  {isSearching 
                    ? 'No se encontraron juegos. Intenta con otra búsqueda.' 
                    : 'No hay juegos que coincidan con los filtros seleccionados.'}
                </p>
              </div>
            )}

            {/* Grid de juegos */}
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
          </div>

        </div>
      </main>

      {/* Modal de agregar juego */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Agregar "{selectedGame?.name}" a tu lista
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="completed">Completado</option>
                <option value="playing">Jugando</option>
                <option value="wishlist">Lista de deseos</option>
                <option value="dropped">Abandonado</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calificación
              </label>
              <select
                value={addRating || ''}
                onChange={(e) => setAddRating(e.target.value ? parseInt(e.target.value) : null)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Sin calificación</option>
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
                Cancelar
              </button>
              <button
                onClick={handleAddGame}
                disabled={addLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addLoading ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;