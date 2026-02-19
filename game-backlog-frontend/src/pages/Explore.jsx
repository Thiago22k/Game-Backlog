import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, X, Flame, Star, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import InteractiveGameCard from '../components/games/InteractiveGameCard';
import { ChevronDown } from 'lucide-react';
import AnticipatedGameCard from '../components/games/AnticipatedGameCard';

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addGame, updateGame, deleteGame, userGames, getUserGames } = useGames();

  // Leer parámetros de URL
  const getParamArray = (key) => {
    const value = searchParams.get(key);
    return value ? value.split(',').map(Number) : [];
  };

  // Estados
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [isAnticipatedMode, setIsAnticipatedMode] = useState(searchParams.get('anticipated') === 'true');

  // Refs para cerrar al hacer click fuera
  const genreDropdownRef = useRef(null);
  const platformDropdownRef = useRef(null);

  // Filtros
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [timeRange, setTimeRange] = useState(searchParams.get('timeRange') || 'all');
  const [selectedGenres, setSelectedGenres] = useState(getParamArray('genres'));
  const [selectedPlatforms, setSelectedPlatforms] = useState(getParamArray('platforms'));

  // Datos de filtros
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);

// Cargar géneros y plataformas
useEffect(() => {
  const fetchFilters = async () => {
    try {
      // Cargar géneros primero
      const genresRes = await axios.get(ENDPOINTS.GAMES.GENRES);
      setAvailableGenres(genresRes.data.genres);
      
      // Reducir de 1000ms a 250ms
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const platformsRes = await axios.get(ENDPOINTS.GAMES.PLATFORMS);
      
      const sortedPlatforms = platformsRes.data.platforms.sort((a, b) => {
        const topPlatforms = [6, 167, 48, 169, 49, 130];
        const aIsTop = topPlatforms.includes(a.id);
        const bIsTop = topPlatforms.includes(b.id);
        
        if (aIsTop && !bIsTop) return -1;
        if (!aIsTop && bIsTop) return 1;
        return a.name.localeCompare(b.name);
      });

      setAvailablePlatforms(sortedPlatforms);
      
    } catch (error) {
      console.error('Error loading filters:', error);
      setTimeout(() => {
        fetchFilters();
      }, 2000);
    }
  };
  
  fetchFilters();

  if (isAuthenticated) {
    // Reducir de 1200ms a 400ms
    setTimeout(() => {
      getUserGames();
    }, 400);
  }
}, [isAuthenticated]);

  // Cerrar dropdowns al hacer click fuera
useEffect(() => {
  const handleClickOutside = (event) => {
    if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target)) {
      setGenreDropdownOpen(false);
    }
    if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target)) {
      setPlatformDropdownOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// Funciones para toggle
const toggleGenre = (genreId) => {
  setSelectedGenres(prev => 
    prev.includes(genreId) 
      ? prev.filter(id => id !== genreId)
      : [...prev, genreId]
  );
};

const togglePlatform = (platformId) => {
  setSelectedPlatforms(prev => 
    prev.includes(platformId) 
      ? prev.filter(id => id !== platformId)
      : [...prev, platformId]
  );
};

  // Actualizar URL cuando cambian filtros
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set('search', searchQuery);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (timeRange !== 'all') params.set('timeRange', timeRange);
    if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
    if (selectedPlatforms.length > 0) params.set('platforms', selectedPlatforms.join(','));
    if (isAnticipatedMode) params.set('anticipated', 'true');

    setSearchParams(params);
  }, [searchQuery, sortBy, timeRange, selectedGenres, selectedPlatforms, isAnticipatedMode]);

const fetchGames = async (reset = false) => {
  setLoading(true);

  try {
    let response;

    // Si hay búsqueda, usar endpoint de search
    if (searchQuery.trim()) {
      response = await axios.get(`${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(searchQuery)}`);
      
      const now = Date.now() / 1000;
      const filteredGames = response.data.games.filter(game => 
        game.first_release_date && game.first_release_date <= now
      );

      const mergedGames = filteredGames.map(game => {
        const userGame = userGames.find(ug => ug.igdb_game_id === game.id);
        return {
          ...game,
          status: userGame?.status || null,
          user_rating: userGame?.rating || 0,
        };
      });

      setGames(mergedGames);
      setHasMore(false);
      setOffset(0);
    } else if (isAnticipatedMode) {
      // Modo anticipated: usar endpoint especial
      const limit = 20;
      response = await axios.get(`${ENDPOINTS.GAMES.ANTICIPATED}?limit=${limit}`);
      const anticipatedGames = response.data.games;

      // Mezclar con datos del usuario
      const mergedGames = anticipatedGames.map(game => {
        const userGame = userGames.find(ug => ug.igdb_game_id === game.id);
        return {
          ...game,
          status: userGame?.status || null,
          user_rating: userGame?.rating || 0,
        };
      });

      setGames(mergedGames);
      setHasMore(false); // No hay paginación en anticipated
      setOffset(0);
    } else {
      // Modo normal: usar endpoint de explore con filtros
      const params = new URLSearchParams();
      params.append('sort', sortBy);
      if (timeRange !== 'all') params.append('timeRange', timeRange);
      params.append('limit', 20);
      params.append('offset', reset ? 0 : offset);
      
      if (selectedGenres.length > 0) {
        params.append('genres', selectedGenres.join(','));
      }
      
      if (selectedPlatforms.length > 0) {
        params.append('platforms', selectedPlatforms.join(','));
      }

      response = await axios.get(`${ENDPOINTS.GAMES.EXPLORE}?${params.toString()}`);
      const newGames = response.data.games;

      const mergedGames = newGames.map(game => {
        const userGame = userGames.find(ug => ug.igdb_game_id === game.id);
        return {
          ...game,
          status: userGame?.status || null,
          user_rating: userGame?.rating || 0,
        };
      });

      if (reset) {
        setGames(mergedGames);
        setOffset(20);
      } else {
        setGames(prev => [...prev, ...mergedGames]);
        setOffset(prev => prev + 20);
      }

      setHasMore(newGames.length === 20);
    }
  } catch (error) {
    console.error('Error loading games:', error);
    toast.error('Error loading games');
  } finally {
    setLoading(false);
  }
};

// Recargar cuando cambian filtros o búsqueda
useEffect(() => {
  if (searchQuery.trim()) {
    const timer = setTimeout(() => {
      fetchGames(true);
    }, 500);
    return () => clearTimeout(timer);
  }
  
  // Reducir de 1500ms a 600ms
  const timer = setTimeout(() => {
    fetchGames(true);
  }, 600);
  
  return () => clearTimeout(timer);
}, [searchQuery, sortBy, timeRange, selectedGenres, selectedPlatforms, isAnticipatedMode]);

  // Handlers

  const handleWishlistToggle = async (gameId, newStatus) => {
  if (!isAuthenticated) return;

  if (newStatus === null) {
    const result = await deleteGame(gameId);
    if (result.success) {
      toast.success('Removed from wishlist');
      setGames(prev => prev.map(g => 
        g.id === gameId ? { ...g, status: null } : g
      ));
    } else {
      toast.error('Error removing from wishlist');
    }
  } else {
    const result = await addGame(gameId, 'wishlist');
    if (result.success) {
      toast.success('Added to wishlist!');
      setGames(prev => prev.map(g => 
        g.id === gameId ? { ...g, status: 'wishlist' } : g
      ));
    } else {
      toast.error('Error adding to wishlist');
    }
  }
};

  const handleStatusChange = async (gameId, newStatus) => {
    if (!isAuthenticated) return;

    const existingGame = userGames.find(g => g.igdb_game_id === gameId);

    if (newStatus === null && existingGame) {
      const result = await deleteGame(gameId);
      if (result.success) {
        toast.success('Game removed from your list');
        setGames(prev => prev.map(g => 
          g.id === gameId ? { ...g, status: null, user_rating: 0 } : g
        ));
      } else {
        toast.error('Error removing game');
      }
    } else if (existingGame) {
      const result = await updateGame(gameId, newStatus, existingGame.rating);
      if (result.success) {
        toast.success('Status updated');
        setGames(prev => prev.map(g => 
          g.id === gameId ? { ...g, status: newStatus } : g
        ));
      } else {
        toast.error('Error updating status');
      }
    } else if (newStatus !== null) {
      const result = await addGame(gameId, newStatus);
      if (result.success) {
        toast.success('Game added to your list!');
        setGames(prev => prev.map(g => 
          g.id === gameId ? { ...g, status: newStatus } : g
        ));
      } else {
        toast.error('Error adding game');
      }
    }
  };

  const handleRatingChange = async (gameId, rating) => {
    if (!isAuthenticated) return;

    const existingGame = userGames.find(g => g.igdb_game_id === gameId);

    if (existingGame) {
      const result = await updateGame(gameId, existingGame.status, rating);
      if (result.success) {
        toast.success(`Rating saved: ${rating} ⭐`);
        setGames(prev => prev.map(g => 
          g.id === gameId ? { ...g, user_rating: rating } : g
        ));
      } else {
        toast.error('Error saving rating');
      }
    }
  };

  // Filtros rápidos
  const quickFilters = [
    { icon: Flame, label: 'Trending', sort: 'relevance', time: 'last_month' },
    { icon: Star, label: 'Most Popular', sort: 'popular', time: 'all' },
    { icon: Clock, label: 'Indie', sort: 'relevance', time: 'all', genre: 32 }, // Indie genre ID
    { icon: Sparkles, label: 'New Releases', sort: 'recent', time: 'this_year' },
    { icon: Clock, label: 'Most Anticipated', isAnticipated: true },
  ];

  const applyQuickFilter = (filter) => {
  if (filter.isAnticipated) {
    // Modo especial para anticipated
    setIsAnticipatedMode(true);
    setSortBy('relevance');
    setTimeRange('all');
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setGames([]);
  } else {
    // Modo normal
    setIsAnticipatedMode(false);
    setSortBy(filter.sort);
    setTimeRange(filter.time);
    if (filter.genre) {
      setSelectedGenres([filter.genre]);
    } else {
      setSelectedGenres([]);
    }
    setSelectedPlatforms([]);
    setGames([]);
  }
};

  const clearAllFilters = () => {
  setSearchQuery('');
  setSortBy('relevance');
  setTimeRange('all');
  setSelectedGenres([]);
  setSelectedPlatforms([]);
  setIsAnticipatedMode(false);
  setGames([]);
};

  const activeFiltersCount = 
    (sortBy !== 'relevance' ? 1 : 0) +
    (timeRange !== 'all' ? 1 : 0) +
    selectedGenres.length +
    selectedPlatforms.length;

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Explore Games</h1>
          <p className="text-gray-400">Discover your next favorite game</p>
        </div>

        {/* Búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-primary-navy-dark border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-yellow transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="mb-6 flex flex-wrap gap-2">
          {quickFilters.map((filter, index) => {
            const Icon = filter.icon;
            return (
              <button
                key={index}
                onClick={() => applyQuickFilter(filter)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-navy-dark border border-gray-700 rounded-lg text-white hover:border-primary-yellow hover:text-primary-yellow transition-all"
              >
                <Icon size={16} />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Mostrar aviso en modo anticipated */}
{isAnticipatedMode && (
  <div className="mb-6 bg-primary-yellow/20 border border-primary-yellow rounded-lg p-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Clock className="text-primary-yellow" size={20} />
      <span className="text-white font-medium">
        Showing upcoming releases
      </span>
    </div>
    <button
  onClick={() => {
    setIsAnticipatedMode(false);
    setGames([]); // ← Agregar
  }}
  className="text-primary-yellow hover:text-primary-yellow-dark underline text-sm"
>
  Show all games
</button>
  </div>
)}

{/* Filtros principales - Ocultar en modo anticipated */}
{!isAnticipatedMode && (
  <div className="mb-6 bg-primary-navy-dark border border-gray-700 rounded-lg p-4">
    {/* ... filtros existentes ... */}
  </div>
)}

        {/* Filtros principales */}
<div className="mb-6 bg-primary-navy-dark border border-gray-700 rounded-lg p-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Sort */}
    <div>
      <label className="block text-sm text-gray-400 mb-2">Sort by</label>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
      >
        <option value="relevance">Relevance</option>
        <option value="popular">Popular</option>
        <option value="highest_rated">Highest Rated</option>
        <option value="recent">Recent</option>
      </select>
    </div>

    {/* Time Range */}
    <div>
      <label className="block text-sm text-gray-400 mb-2">Time Range</label>
      <select
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value)}
        className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
      >
        <option value="all">All Time</option>
        <option value="last_month">Last Month</option>
        <option value="this_year">This Year</option>
        <option value="last_year">Last Year</option>
        <option value="last_5_years">Last 5 Years</option>
      </select>
    </div>

    {/* Genres Dropdown */}
    <div className="relative" ref={genreDropdownRef}>
      <label className="block text-sm text-gray-400 mb-2">Genres</label>
      <button
        onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
        className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 flex items-center justify-between focus:outline-none focus:border-primary-yellow"
      >
        <span>
          {selectedGenres.length === 0 
            ? 'All Genres' 
            : `${selectedGenres.length} selected`}
        </span>
        <ChevronDown size={16} />
      </button>

      {genreDropdownOpen && (
        <div className="absolute z-50 mt-2 w-full bg-primary-navy-dark border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {availableGenres.map(genre => (
            <label
              key={genre.id}
              className="flex items-center px-3 py-2 hover:bg-primary-navy cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedGenres.includes(genre.id)}
                onChange={() => toggleGenre(genre.id)}
                className="mr-2 accent-primary-yellow"
              />
              <span className="text-white text-sm">{genre.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>

    {/* Platforms Dropdown */}
    <div className="relative" ref={platformDropdownRef}>
      <label className="block text-sm text-gray-400 mb-2">Platforms</label>
      <button
        onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
        className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 flex items-center justify-between focus:outline-none focus:border-primary-yellow"
      >
        <span>
          {selectedPlatforms.length === 0 
            ? 'All Platforms' 
            : `${selectedPlatforms.length} selected`}
        </span>
        <ChevronDown size={16} />
      </button>

      {platformDropdownOpen && (
        <div className="absolute z-50 mt-2 w-full bg-primary-navy-dark border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {availablePlatforms.map(platform => (
            <label
              key={platform.id}
              className="flex items-center px-3 py-2 hover:bg-primary-navy cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform.id)}
                onChange={() => togglePlatform(platform.id)}
                className="mr-2 accent-primary-yellow"
              />
              <span className="text-white text-sm">{platform.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  </div>

  {/* Filtros activos */}
  {activeFiltersCount > 0 && (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-gray-400">
        {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
      </span>
      <button
        onClick={clearAllFilters}
        className="text-sm text-primary-yellow hover:text-primary-yellow-dark"
      >
        Clear All
      </button>
    </div>
  )}
</div>

        {/* Contador de juegos */}
        <div className="mb-6 text-gray-400">
          Showing {games.length} games
        </div>

        {/* Grid de juegos */}
{loading && games.length === 0 ? (
  <div className="text-center py-12">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow"></div>
  </div>
) : games.length === 0 ? (
  <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
    <p className="text-gray-400">No games found. Try adjusting your filters.</p>
  </div>
) : (
  <>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
      {games.map((game) => (
        isAnticipatedMode ? (
          <AnticipatedGameCard
            key={game.id}
            game={game}
            interactive={isAuthenticated}
            onWishlistToggle={handleWishlistToggle}
          />
        ) : (
          <InteractiveGameCard
            key={game.id}
            game={game}
            interactive={isAuthenticated}
            onStatusChange={handleStatusChange}
            onRatingChange={handleRatingChange}
          />
        )
      ))}
    </div>

    {/* Load More (solo en modo normal) */}
    {hasMore && !isAnticipatedMode && (
      <div className="text-center">
        <button
          onClick={() => fetchGames(false)}
          disabled={loading}
          className="px-8 py-3 bg-primary-yellow text-primary-navy-dark rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    )}
  </>
)}
      </main>
    </div>
  );
};

export default Explore;