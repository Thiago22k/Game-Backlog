import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, X, Flame, Star, Sparkles, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import InteractiveGameCard from '../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../components/games/AnticipatedGameCard';
import InteractiveGameCardSkeleton from '../components/games/InteractiveGameCardSkeleton';
import AnticipatedGameCardSkeleton from '../components/games/AnticipatedGameCardSkeleton';
import usePageTitle from '../hooks/usePageTitle';

const TOP_PLATFORMS = [6, 167, 48, 169, 49, 130];

const GAME_TYPES = [
  { id: 0, name: 'Main Game' },
  { id: 1, name: 'DLC / Add-on' },
  { id: 8, name: 'Remake' },
  { id: 9, name: 'Remaster' },
  { id: 13, name: 'Pack' },
];

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addGame, updateGame, deleteGame, userGames, getUserGames } = useGames();

  // Leer parámetros de URL
  const getParamArray = useCallback((key) => {
    const value = searchParams.get(key);
    return value ? value.split(',').map(Number) : [];
  }, [searchParams]);

  // Estados
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [showFilters, setShowFilters] = useState(false);

  usePageTitle('Explore');

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [gameTypeDropdownOpen, setGameTypeDropdownOpen] = useState(false);
  const [isAnticipatedMode, setIsAnticipatedMode] = useState(
    initialSearch ? false : searchParams.get('anticipated') === 'true'
  );

  // Refs para cerrar al hacer click fuera
  const genreDropdownRef = useRef(null);
  const platformDropdownRef = useRef(null);
  const gameTypeDropdownRef = useRef(null);

  // Filtros
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [timeRange, setTimeRange] = useState(searchParams.get('timeRange') || 'all');
  const [selectedGenres, setSelectedGenres] = useState(() => getParamArray('genres'));
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => getParamArray('platforms'));
  const [selectedGameTypes, setSelectedGameTypes] = useState(() => getParamArray('gameTypes'));

  // Datos de filtros
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);

  // Ref siempre actualizado con el último valor de userGames
  // para evitar closures con estado obsoleto en fetchGames.
  const userGamesRef = useRef(userGames);
  useEffect(() => { userGamesRef.current = userGames; }, [userGames]);

  // Helper: mezclar juegos con datos del usuario.
  // Usa el ref para leer el valor más reciente de forma síncrona.
  const mergeWithUserGames = useCallback((gamesList) => {
    return gamesList.map((game) => {
      const userGame = userGamesRef.current.find((ug) => ug.igdb_game_id === game.id);
      return {
        ...game,
        status: userGame?.status ?? null,
        user_rating: userGame?.rating ?? 0,
      };
    });
  }, []);

  // Cargar géneros, plataformas y juegos del usuario en paralelo
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [genresRes, platformsRes] = await Promise.all([
          axios.get(ENDPOINTS.GAMES.GENRES),
          axios.get(ENDPOINTS.GAMES.PLATFORMS),
        ]);

        setAvailableGenres(genresRes.data.genres);

        const sortedPlatforms = [...platformsRes.data.platforms].sort((a, b) => {
          const aIsTop = TOP_PLATFORMS.includes(a.id);
          const bIsTop = TOP_PLATFORMS.includes(b.id);
          if (aIsTop && !bIsTop) return -1;
          if (!aIsTop && bIsTop) return 1;
          return a.name.localeCompare(b.name);
        });

        setAvailablePlatforms(sortedPlatforms);
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };

    fetchFilters();

    if (isAuthenticated) {
      // Cargamos los juegos del usuario y actualizamos el ref inmediatamente
      // para que fetchGames siempre tenga datos frescos al ejecutarse.
      getUserGames().then((result) => {
        if (result.success) {
          userGamesRef.current = result.data;
        }
      });
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
      if (gameTypeDropdownRef.current && !gameTypeDropdownRef.current.contains(event.target)) {
        setGameTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Funciones para toggle
  const toggleGenre = useCallback((genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  }, []);

  const togglePlatform = useCallback((platformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId]
    );
  }, []);

  const toggleGameType = useCallback((typeId) => {
    setSelectedGameTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  }, []);

  // Actualizar URL cuando cambian filtros
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (timeRange !== 'all') params.set('timeRange', timeRange);
    if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
    if (selectedPlatforms.length > 0) params.set('platforms', selectedPlatforms.join(','));
    if (selectedGameTypes.length > 0) params.set('gameTypes', selectedGameTypes.join(','));
    if (isAnticipatedMode) params.set('anticipated', 'true');
    setSearchParams(params);
  }, [searchQuery, sortBy, timeRange, selectedGenres, selectedPlatforms, selectedGameTypes, isAnticipatedMode]);

  const fetchGames = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      let response;

      if (searchQuery.trim()) {
        response = await axios.get(`${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(searchQuery)}`);
        const gracePeriod = 24 * 60 * 60;
        const nowWithGrace = Math.floor(Date.now() / 1000) - gracePeriod;

        // Incluir juegos ya lanzados O que lanzaron hace menos de 24h (para que el resto de la lógica los maneje)
        const filtered = response.data.games.filter(
          (game) => game.first_release_date && game.first_release_date <= (Math.floor(Date.now() / 1000) + gracePeriod * 365) // Permitir ver todo en búsqueda, la tarjeta decidirá el estilo
        );
        setGames(mergeWithUserGames(filtered));
        setHasMore(false);
        setOffset(0);
      } else if (isAnticipatedMode) {
        // Obtenemos los juegos anticipados y los datos del usuario en paralelo
        // para garantizar que el merge siempre tenga datos frescos.
        const [anticipatedRes, userRes] = await Promise.all([
          axios.get(`${ENDPOINTS.GAMES.ANTICIPATED}?limit=20`),
          isAuthenticated ? axios.get(ENDPOINTS.GAMES.USER_GAMES) : Promise.resolve(null),
        ]);

        if (userRes) {
          userGamesRef.current = userRes.data.games;
        }

        setGames(mergeWithUserGames(anticipatedRes.data.games));
        setHasMore(false);
        setOffset(0);
      } else {
        const params = new URLSearchParams({ sort: sortBy, limit: 20, offset: reset ? 0 : offset });
        if (timeRange !== 'all') params.append('timeRange', timeRange);
        if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
        if (selectedPlatforms.length > 0) params.append('platforms', selectedPlatforms.join(','));
        if (selectedGameTypes.length > 0) params.append('gameTypes', selectedGameTypes.join(','));

        response = await axios.get(`${ENDPOINTS.GAMES.EXPLORE}?${params.toString()}`);
        const newGames = mergeWithUserGames(response.data.games);

        if (reset) {
          setGames(newGames);
          setOffset(20);
        } else {
          setGames((prev) => [...prev, ...newGames]);
          setOffset((prev) => prev + 20);
        }
        setHasMore(response.data.games.length === 20);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      toast.error('Error loading games');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, isAnticipatedMode, isAuthenticated, sortBy, timeRange, selectedGenres, selectedPlatforms, selectedGameTypes, offset, mergeWithUserGames]);

  // Recargar cuando cambian filtros o búsqueda
  useEffect(() => {
    // 400ms para búsqueda (debounce por tipeo), 150ms para filtros (click único)
    const delay = searchQuery.trim() ? 400 : 150;
    const timer = setTimeout(() => fetchGames(true), delay);
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy, timeRange, selectedGenres, selectedPlatforms, selectedGameTypes, isAnticipatedMode]);

  // Handlers
  const handleWishlistToggle = useCallback(async (gameId, newStatus) => {
    if (!isAuthenticated) return;

    if (newStatus === null) {
      const result = await deleteGame(gameId);
      if (result.success) {
        toast.success('Removed from wishlist');
        setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, status: null } : g)));
      } else {
        toast.error('Error removing from wishlist');
      }
    } else {
      const result = await addGame(gameId, 'wishlist');
      if (result.success) {
        toast.success('Added to wishlist!');
        setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, status: 'wishlist' } : g)));
      } else {
        toast.error('Error adding to wishlist');
      }
    }
  }, [isAuthenticated, addGame, deleteGame]);

  const handleStatusChange = useCallback(async (gameId, newStatus) => {
    if (!isAuthenticated) return;

    const existingGame = userGames.find((g) => g.igdb_game_id === gameId);

    if (newStatus === null && existingGame) {
      const result = await deleteGame(gameId);
      if (result.success) {
        toast.success('Game removed from your list');
        setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, status: null, user_rating: 0 } : g)));
      } else {
        toast.error('Error removing game');
      }
    } else if (existingGame) {
      const result = await updateGame(gameId, newStatus, existingGame.rating);
      if (result.success) {
        toast.success('Status updated');
        setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, status: newStatus } : g)));
      } else {
        toast.error('Error updating status');
      }
    } else if (newStatus !== null) {
      const result = await addGame(gameId, newStatus);
      if (result.success) {
        toast.success('Game added to your list!');
        setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, status: newStatus } : g)));
      } else {
        toast.error('Error adding game');
      }
    }
  }, [isAuthenticated, userGames, addGame, updateGame, deleteGame]);

  const handleRatingChange = useCallback(async (gameId, rating) => {
    if (!isAuthenticated) return;
    const existingGame = userGames.find((g) => g.igdb_game_id === gameId);
    if (!existingGame) return;

    const result = await updateGame(gameId, existingGame.status, rating);
    if (result.success) {
      toast.success(`Rating saved: ${rating} ⭐`);
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, user_rating: rating } : g)));
    } else {
      toast.error('Error saving rating');
    }
  }, [isAuthenticated, userGames, updateGame]);

  // Filtros rápidos
  const quickFilters = useMemo(() => [
    { icon: Flame, label: 'Trending', sort: 'relevance', time: 'last_month' },
    { icon: Star, label: 'Most Popular', sort: 'popular', time: 'all' },
    { icon: Clock, label: 'Indie', sort: 'relevance', time: 'all', genre: 32 },
    { icon: Sparkles, label: 'New Releases', sort: 'recent', time: 'this_year' },
    { icon: Clock, label: 'Most Anticipated', isAnticipated: true },
  ], []);

  const applyQuickFilter = useCallback((filter) => {
    setIsAnticipatedMode(!!filter.isAnticipated);
    if (filter.isAnticipated) {
      setSearchQuery('');
    }
    setSortBy(filter.sort ?? 'relevance');
    setTimeRange(filter.time ?? 'all');
    setSelectedGenres(filter.genre ? [filter.genre] : []);
    setSelectedPlatforms([]);
    setGames([]);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSortBy('relevance');
    setTimeRange('all');
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSelectedGameTypes([]);
    setIsAnticipatedMode(false);
    setGames([]);
  }, []);

  const activeFiltersCount = useMemo(
    () =>
      (sortBy !== 'relevance' ? 1 : 0) +
      (timeRange !== 'all' ? 1 : 0) +
      selectedGenres.length +
      selectedPlatforms.length +
      selectedGameTypes.length,
    [sortBy, timeRange, selectedGenres, selectedPlatforms, selectedGameTypes]
  );

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      <main className="max-w-7xl mx-auto pt-32 pb-6 px-4 sm:px-6 lg:px-8">
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim() !== '') {
                  setIsAnticipatedMode(false);
                }
              }}
              className="w-full pl-10 pr-4 py-3 bg-primary-navy-dark rounded-lg text-white placeholder-gray-400 focus:outline-none transition-colors"
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
          {quickFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.label}
                onClick={() => applyQuickFilter(filter)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-navy-dark border border-transparent rounded-lg text-white hover:border-primary-yellow hover:text-primary-yellow transition-all"
              >
                <Icon size={16} />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Aviso en modo anticipated */}
        {isAnticipatedMode && (
          <div className="mb-6 bg-primary-yellow/20 border border-primary-yellow rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-primary-yellow" size={20} />
              <span className="text-white font-medium">Showing upcoming releases</span>
            </div>
            <button
              onClick={() => { setIsAnticipatedMode(false); setGames([]); }}
              className="text-primary-yellow hover:text-primary-yellow-dark underline text-sm"
            >
              Show all games
            </button>
          </div>
        )}

        {/* Filtros principales */}
        {!isAnticipatedMode && (
          <div className="mb-6 bg-primary-navy-dark rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sort */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-primary-navy text-white rounded-lg px-3 py-2 focus:outline-none"
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
                  className="w-full bg-primary-navy text-white rounded-lg px-3 py-2 focus:outline-none"
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
                  onClick={() => setGenreDropdownOpen((o) => !o)}
                  className="w-full bg-primary-navy text-white rounded-lg px-3 py-2 flex items-center justify-between focus:outline-none"
                >
                  <span>{selectedGenres.length === 0 ? 'All Genres' : `${selectedGenres.length} selected`}</span>
                  <ChevronDown size={16} />
                </button>
                {genreDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-primary-navy-dark border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                    {availableGenres.map((genre) => (
                      <label key={genre.id} className="flex items-center px-3 py-2 hover:bg-primary-navy cursor-pointer">
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
                  onClick={() => setPlatformDropdownOpen((o) => !o)}
                  className="w-full bg-primary-navy text-white rounded-lg px-3 py-2 flex items-center justify-between focus:outline-none"
                >
                  <span>{selectedPlatforms.length === 0 ? 'All Platforms' : `${selectedPlatforms.length} selected`}</span>
                  <ChevronDown size={16} />
                </button>
                {platformDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-primary-navy-dark border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                    {availablePlatforms.map((platform) => (
                      <label key={platform.id} className="flex items-center px-3 py-2 hover:bg-primary-navy cursor-pointer">
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

              {/* Game Types Dropdown */}
              <div className="relative" ref={gameTypeDropdownRef}>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <button
                  onClick={() => setGameTypeDropdownOpen((o) => !o)}
                  className="w-full bg-primary-navy text-white rounded-lg px-3 py-2 flex items-center justify-between focus:outline-none"
                >
                  <span>{selectedGameTypes.length === 0 ? 'All Categories' : `${selectedGameTypes.length} selected`}</span>
                  <ChevronDown size={16} />
                </button>
                {gameTypeDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-primary-navy-dark border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                    {GAME_TYPES.map((type) => (
                      <label key={type.id} className="flex items-center px-3 py-2 hover:bg-primary-navy cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGameTypes.includes(type.id)}
                          onChange={() => toggleGameType(type.id)}
                          className="mr-2 accent-primary-yellow"
                        />
                        <span className="text-white text-sm">{type.name}</span>
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
                <button onClick={clearAllFilters} className="text-sm text-primary-yellow hover:text-primary-yellow-dark">
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contador de juegos */}
        <div className="mb-6 text-gray-400">Showing {games.length} games</div>

        {/* Grid de juegos */}
        {loading && games.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 12 }).map((_, i) =>
              isAnticipatedMode ? (
                <AnticipatedGameCardSkeleton key={`skel-${i}`} />
              ) : (
                <InteractiveGameCardSkeleton key={`skel-${i}`} />
              )
            )}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
            <p className="text-gray-400">No games found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
              {games.map((game) => {
                const releaseThreshold = game.first_release_date
                  ? (game.first_release_date * 1000) + (24 * 60 * 60 * 1000)
                  : null;
                const isEffectivelyUnreleased = !releaseThreshold || releaseThreshold > Date.now();

                return isEffectivelyUnreleased ? (
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
                );
              })}
            </div>

            {/* Load More */}
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