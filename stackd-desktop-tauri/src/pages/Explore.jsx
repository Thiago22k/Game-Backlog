import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  X,
  Flame,
  Star,
  Sparkles,
  Clock,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import InteractiveGameCard from '../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../components/games/AnticipatedGameCard';
import InteractiveGameCardSkeleton from '../components/games/InteractiveGameCardSkeleton';
import AnticipatedGameCardSkeleton from '../components/games/AnticipatedGameCardSkeleton';
import useSEO from '../hooks/useSEO';
import CustomSelect from '../components/common/CustomSelect';

const TOP_PLATFORMS = [6, 167, 48, 169, 49, 130];

const GAME_TYPES = [
  { id: 0, name: 'Main Game' },
  { id: 1, name: 'DLC / Add-on' },
  { id: 8, name: 'Remake' },
  { id: 9, name: 'Remaster' },
  { id: 13, name: 'Pack' },
];

const QUICK_FILTERS = [
  { id: 'trending', icon: Flame, label: 'Trending', sort: 'relevance', time: 'last_month' },
  { id: 'popular', icon: Star, label: 'Most Popular', sort: 'popular', time: 'all' },
  { id: 'indie', icon: Sparkles, label: 'Indie', sort: 'relevance', time: 'all', genre: 32 },
  { id: 'recent', icon: Clock, label: 'New Releases', sort: 'recent', time: 'this_year' },
  { id: 'anticipated', icon: Clock, label: 'Most Anticipated', isAnticipated: true },
];

// Caché de sesión para búsquedas repetidas instantáneas
const searchSessionCache = new Map();

function getTimeRangeThreshold(timeRange) {
  const nowSec = Math.floor(Date.now() / 1000);
  const day = 86400;
  switch (timeRange) {
    case 'last_month':
      return nowSec - day * 30;
    case 'this_year': {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
      return Math.floor(startOfYear);
    }
    case 'last_year':
      return nowSec - day * 365;
    case 'last_5_years':
      return nowSec - day * 365 * 5;
    default:
      return null;
  }
}

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addGame, updateGame, deleteGame, userGames, getUserGames } = useGames();

  const getParamArray = useCallback(
    (key) => {
      const value = searchParams.get(key);
      return value ? value.split(',').map(Number).filter((n) => !Number.isNaN(n)) : [];
    },
    [searchParams]
  );

  // Estados principales
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Dropdowns y búsqueda interna dentro de filtros
  const [openDropdown, setOpenDropdown] = useState(null); // 'genres' | 'platforms' | 'types' | null
  const [genreFilterText, setGenreFilterText] = useState('');
  const [platformFilterText, setPlatformFilterText] = useState('');

  const [isAnticipatedMode, setIsAnticipatedMode] = useState(
    initialSearch ? false : searchParams.get('anticipated') === 'true'
  );

  // Filtros
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [timeRange, setTimeRange] = useState(searchParams.get('timeRange') || 'all');
  const [selectedGenres, setSelectedGenres] = useState(() => getParamArray('genres'));
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => getParamArray('platforms'));
  const [selectedGameTypes, setSelectedGameTypes] = useState(() => getParamArray('gameTypes'));

  // Catálogos de filtros
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);

  const filtersContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const offsetRef = useRef(0);

  useSEO({
    title: 'Explore Games',
    description: 'Browse, search, and discover new games. Filter by genre, platform, and more on Stackd.',
  });

  // Mapa O(1) con el estado de biblioteca del usuario
  const userGamesMapRef = useRef(new Map());
  useEffect(() => {
    const map = new Map();
    userGames.forEach((ug) => map.set(ug.igdb_game_id, ug));
    userGamesMapRef.current = map;
  }, [userGames]);

  const mergeWithUserGames = useCallback((gamesList) => {
    return gamesList.map((game) => {
      const userGame = userGamesMapRef.current.get(game.id);
      return {
        ...game,
        status: userGame?.status ?? null,
        user_rating: userGame?.rating ?? 0,
      };
    });
  }, []);

  // Re-sincronizar tarjetas ya renderizadas cuando cambia userGames
  useEffect(() => {
    setGames((prev) => (prev.length ? mergeWithUserGames(prev) : prev));
  }, [userGames, mergeWithUserGames]);

  // Cargar géneros, plataformas y biblioteca del usuario
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [genresRes, platformsRes] = await Promise.all([
          axios.get(ENDPOINTS.GAMES.GENRES),
          axios.get(ENDPOINTS.GAMES.PLATFORMS),
        ]);

        setAvailableGenres(genresRes.data.genres || []);

        const sortedPlatforms = [...(platformsRes.data.platforms || [])].sort((a, b) => {
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
      getUserGames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Cerrar dropdowns al hacer click fuera o pulsar Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersContainerRef.current && !filtersContainerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Toggles de filtros
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

  // Sincronizar URL sin ensuciar el historial
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (timeRange !== 'all') params.set('timeRange', timeRange);
    if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
    if (selectedPlatforms.length > 0) params.set('platforms', selectedPlatforms.join(','));
    if (selectedGameTypes.length > 0) params.set('gameTypes', selectedGameTypes.join(','));
    if (isAnticipatedMode) params.set('anticipated', 'true');
    setSearchParams(params, { replace: true });
  }, [
    searchQuery,
    sortBy,
    timeRange,
    selectedGenres,
    selectedPlatforms,
    selectedGameTypes,
    isAnticipatedMode,
    setSearchParams,
  ]);

  // Aplicar filtros y ordenamiento sobre resultados de búsqueda para que Search + Filtros trabajen juntos
  const applyClientFiltersToSearch = useCallback(
    (rawGames) => {
      const minReleaseTs = getTimeRangeThreshold(timeRange);

      const filtered = rawGames.filter((game) => {
        if (selectedGenres.length > 0) {
          const gameGenreIds = (game.genres || []).map((g) => g.id);
          if (!selectedGenres.some((id) => gameGenreIds.includes(id))) return false;
        }
        if (selectedPlatforms.length > 0) {
          const gamePlatformIds = (game.platforms || []).map((p) => p.id);
          if (!selectedPlatforms.some((id) => gamePlatformIds.includes(id))) return false;
        }
        if (selectedGameTypes.length > 0) {
          const typeId = game.game_type ?? 0;
          if (!selectedGameTypes.includes(typeId)) return false;
        }
        if (minReleaseTs && (!game.first_release_date || game.first_release_date < minReleaseTs)) {
          return false;
        }
        return true;
      });

      if (sortBy === 'relevance') return filtered;

      return [...filtered].sort((a, b) => {
        if (sortBy === 'highest_rated') {
          return (b.total_rating ?? b.rating ?? 0) - (a.total_rating ?? a.rating ?? 0);
        }
        if (sortBy === 'recent') {
          return (b.first_release_date ?? 0) - (a.first_release_date ?? 0);
        }
        if (sortBy === 'popular') {
          return (b.total_rating_count ?? b.hypes ?? 0) - (a.total_rating_count ?? a.hypes ?? 0);
        }
        return 0;
      });
    },
    [selectedGenres, selectedPlatforms, selectedGameTypes, timeRange, sortBy]
  );

  // Fetch principal con AbortController
  const fetchGames = useCallback(
    async (reset = false, signal = undefined) => {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }

      try {
        const trimmedSearch = searchQuery.trim();

        if (trimmedSearch) {
          const cacheKey = trimmedSearch.toLowerCase();
          let rawGames = searchSessionCache.get(cacheKey);

          if (!rawGames) {
            const response = await axios.get(
              `${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(trimmedSearch)}`,
              { signal }
            );
            rawGames = response.data?.games || [];
            searchSessionCache.set(cacheKey, rawGames);
          }

          const refined = applyClientFiltersToSearch(rawGames);
          setGames(mergeWithUserGames(refined));
          setHasMore(false);
          setOffset(0);
        } else if (isAnticipatedMode) {
          const [anticipatedRes, userRes] = await Promise.all([
            axios.get(`${ENDPOINTS.GAMES.ANTICIPATED}?limit=24`, { signal }),
            isAuthenticated ? axios.get(ENDPOINTS.GAMES.USER_GAMES, { signal }) : Promise.resolve(null),
          ]);

          if (userRes?.data?.games) {
            const map = new Map();
            userRes.data.games.forEach((ug) => map.set(ug.igdb_game_id, ug));
            userGamesMapRef.current = map;
          }

          setGames(mergeWithUserGames(anticipatedRes.data?.games || []));
          setHasMore(false);
          setOffset(0);
        } else {
          const currentOffset = reset ? 0 : offsetRef.current;
          const params = new URLSearchParams({
            sort: sortBy,
            limit: '20',
            offset: String(currentOffset),
          });
          if (timeRange !== 'all') params.append('timeRange', timeRange);
          if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
          if (selectedPlatforms.length > 0) params.append('platforms', selectedPlatforms.join(','));
          if (selectedGameTypes.length > 0) params.append('gameTypes', selectedGameTypes.join(','));

          const response = await axios.get(`${ENDPOINTS.GAMES.EXPLORE}?${params.toString()}`, {
            signal,
          });
          const rawBatch = response.data?.games || [];
          const newGames = mergeWithUserGames(rawBatch);

          if (reset) {
            setGames(newGames);
            offsetRef.current = 20;
            setOffset(20);
          } else {
            setGames((prev) => {
              const seen = new Set(prev.map((g) => g.id));
              return [...prev, ...newGames.filter((g) => !seen.has(g.id))];
            });
            offsetRef.current = currentOffset + 20;
            setOffset(currentOffset + 20);
          }
          setHasMore(rawBatch.length === 20);
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          console.error('Error loading games:', error);
          toast.error('Error loading games');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [
      searchQuery,
      isAnticipatedMode,
      isAuthenticated,
      sortBy,
      timeRange,
      selectedGenres,
      selectedPlatforms,
      selectedGameTypes,
      applyClientFiltersToSearch,
      mergeWithUserGames,
    ]
  );

  // Disparar búsqueda/filtrado con debounce y cancelación
  useEffect(() => {
    const controller = new AbortController();
    const delay = searchQuery.trim() ? 320 : 120;
    const timer = setTimeout(() => {
      fetchGames(true, controller.signal);
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchGames, searchQuery]);

  // Handlers de tarjeta
  const handleWishlistToggle = useCallback(
    async (gameId, newStatus) => {
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
    },
    [isAuthenticated, addGame, deleteGame]
  );

  const handleStatusChange = useCallback(
    async (gameId, newStatus) => {
      if (!isAuthenticated) return;

      const existingGame = userGamesMapRef.current.get(gameId);

      if (newStatus === null && existingGame) {
        const result = await deleteGame(gameId);
        if (result.success) {
          toast.success('Game removed from your list');
          setGames((prev) =>
            prev.map((g) => (g.id === gameId ? { ...g, status: null, user_rating: 0 } : g))
          );
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
    },
    [isAuthenticated, addGame, updateGame, deleteGame]
  );

  const handleRatingChange = useCallback(
    async (gameId, rating) => {
      if (!isAuthenticated) return;
      const existingGame = userGamesMapRef.current.get(gameId);
      if (!existingGame) return;

      const result = await updateGame(gameId, existingGame.status, rating);
      if (result.success) {
        toast.success(`Rating saved: ${rating} ⭐`);
        setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, user_rating: rating } : g)));
      } else {
        toast.error('Error saving rating');
      }
    },
    [isAuthenticated, updateGame]
  );

  const applyQuickFilter = useCallback((filter) => {
    setOpenDropdown(null);
    setIsAnticipatedMode(Boolean(filter.isAnticipated));
    if (filter.isAnticipated) {
      setSearchQuery('');
    }
    setSortBy(filter.sort ?? 'relevance');
    setTimeRange(filter.time ?? 'all');
    setSelectedGenres(filter.genre ? [filter.genre] : []);
    setSelectedPlatforms([]);
    setSelectedGameTypes([]);
  }, []);

  const clearAllFilters = useCallback(() => {
    setOpenDropdown(null);
    setSearchQuery('');
    setSortBy('relevance');
    setTimeRange('all');
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSelectedGameTypes([]);
    setIsAnticipatedMode(false);
  }, []);

  // Detectar qué Quick Filter está activo
  const activeQuickFilterId = useMemo(() => {
    if (isAnticipatedMode) return 'anticipated';
    if (searchQuery.trim() || selectedPlatforms.length > 0 || selectedGameTypes.length > 0) {
      return null;
    }
    if (sortBy === 'relevance' && timeRange === 'last_month' && selectedGenres.length === 0) {
      return 'trending';
    }
    if (sortBy === 'popular' && timeRange === 'all' && selectedGenres.length === 0) {
      return 'popular';
    }
    if (
      sortBy === 'relevance' &&
      timeRange === 'all' &&
      selectedGenres.length === 1 &&
      selectedGenres[0] === 32
    ) {
      return 'indie';
    }
    if (sortBy === 'recent' && timeRange === 'this_year' && selectedGenres.length === 0) {
      return 'recent';
    }
    return null;
  }, [isAnticipatedMode, searchQuery, selectedPlatforms, selectedGameTypes, sortBy, timeRange, selectedGenres]);

  // Chips de filtros seleccionados
  const activeFilterChips = useMemo(() => {
    const chips = [];
    selectedGenres.forEach((id) => {
      const found = availableGenres.find((g) => g.id === id);
      if (found) chips.push({ key: `g-${id}`, label: found.name, onRemove: () => toggleGenre(id) });
    });
    selectedPlatforms.forEach((id) => {
      const found = availablePlatforms.find((p) => p.id === id);
      if (found) {
        chips.push({ key: `p-${id}`, label: found.name, onRemove: () => togglePlatform(id) });
      }
    });
    selectedGameTypes.forEach((id) => {
      const found = GAME_TYPES.find((t) => t.id === id);
      if (found) {
        chips.push({ key: `t-${id}`, label: found.name, onRemove: () => toggleGameType(id) });
      }
    });
    return chips;
  }, [
    selectedGenres,
    selectedPlatforms,
    selectedGameTypes,
    availableGenres,
    availablePlatforms,
    toggleGenre,
    togglePlatform,
    toggleGameType,
  ]);

  const activeFiltersCount =
    (sortBy !== 'relevance' ? 1 : 0) +
    (timeRange !== 'all' ? 1 : 0) +
    selectedGenres.length +
    selectedPlatforms.length +
    selectedGameTypes.length;

  const filteredGenreOptions = useMemo(() => {
    const q = genreFilterText.trim().toLowerCase();
    if (!q) return availableGenres;
    return availableGenres.filter((g) => g.name.toLowerCase().includes(q));
  }, [availableGenres, genreFilterText]);

  const filteredPlatformOptions = useMemo(() => {
    const q = platformFilterText.trim().toLowerCase();
    if (!q) return availablePlatforms;
    return availablePlatforms.filter((p) => p.name.toLowerCase().includes(q));
  }, [availablePlatforms, platformFilterText]);

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      <main className="max-w-7xl mx-auto pt-28 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        {/* Cabecera */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore Games
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Search the full catalog or combine filters to discover your next game
          </p>
        </div>

        {/* Barra de búsqueda limpia */}
        <div className="mb-4">
          <div className="relative flex items-center rounded-2xl bg-primary-navy-dark px-4 transition-colors focus-within:bg-primary-navy-light">
            <Search className="text-gray-400 shrink-0" size={19} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search games, DLCs, remakes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim() !== '') {
                  setIsAnticipatedMode(false);
                }
              }}
              className="h-12 w-full bg-transparent px-3 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters con estado activo */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {QUICK_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeQuickFilterId === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => applyQuickFilter(filter)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${isActive
                    ? 'bg-primary-yellow text-primary-navy'
                    : 'bg-primary-navy-dark text-gray-300 hover:bg-primary-navy-light hover:text-white'
                  }`}
              >
                <Icon size={15} />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Banner modo Anticipated (sin bordes) */}
        {isAnticipatedMode && (
          <div className="mb-6 rounded-2xl bg-primary-yellow/15 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-yellow/20 text-primary-yellow">
                <Clock size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Most Anticipated Upcoming Releases</p>
                <p className="text-xs text-gray-300">
                  Sorted by community hype and upcoming release dates
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAnticipatedMode(false)}
              className="rounded-xl bg-primary-yellow px-3.5 py-2 text-xs font-bold text-primary-navy hover:bg-yellow-300 transition-colors cursor-pointer"
            >
              Back to full catalog
            </button>
          </div>
        )}

        {/* Panel de filtros principales (5 columnas equilibradas, sin bordes) */}
        {!isAnticipatedMode && (
          <div ref={filtersContainerRef} className="mb-6 rounded-2xl bg-primary-navy-dark p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Sort */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1.5">
                  Sort by
                </label>
                <CustomSelect
                  options={[
                    { value: 'relevance', label: 'Relevance' },
                    { value: 'popular', label: 'Popular' },
                    { value: 'highest_rated', label: 'Highest Rated' },
                    { value: 'recent', label: 'Recent' },
                  ]}
                  value={sortBy}
                  onChange={setSortBy}
                  containerClassName="w-full"
                  className="w-full bg-primary-navy rounded-xl"
                />
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1.5">
                  Time Range
                </label>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'last_month', label: 'Last Month' },
                    { value: 'this_year', label: 'This Year' },
                    { value: 'last_year', label: 'Last Year' },
                    { value: 'last_5_years', label: 'Last 5 Years' },
                  ]}
                  value={timeRange}
                  onChange={setTimeRange}
                  containerClassName="w-full"
                  className="w-full bg-primary-navy rounded-xl"
                />
              </div>

              {/* Genres Dropdown con búsqueda interna */}
              <div className="relative">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1.5">
                  Genres
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown((prev) => (prev === 'genres' ? null : 'genres'));
                    setGenreFilterText('');
                  }}
                  className={`w-full h-[42px] rounded-xl px-3.5 text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${selectedGenres.length > 0
                      ? 'bg-primary-yellow/15 text-primary-yellow'
                      : 'bg-primary-navy text-gray-200 hover:bg-primary-navy-light'
                    }`}
                >
                  <span className="truncate">
                    {selectedGenres.length === 0
                      ? 'All Genres'
                      : `${selectedGenres.length} selected`}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${openDropdown === 'genres' ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {openDropdown === 'genres' && (
                  <div className="absolute left-0 z-50 mt-2 w-64 rounded-2xl bg-[#161b29] p-2 shadow-2xl shadow-black/80">
                    <div className="px-1 pb-2">
                      <input
                        type="text"
                        value={genreFilterText}
                        onChange={(e) => setGenreFilterText(e.target.value)}
                        placeholder="Filter genres..."
                        autoFocus
                        className="w-full rounded-xl bg-primary-navy px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
                      {filteredGenreOptions.map((genre) => {
                        const checked = selectedGenres.includes(genre.id);
                        return (
                          <button
                            key={genre.id}
                            type="button"
                            onClick={() => toggleGenre(genre.id)}
                            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${checked
                                ? 'bg-primary-yellow/15 text-primary-yellow'
                                : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                              }`}
                          >
                            <span className="truncate">{genre.name}</span>
                            {checked && <Check size={14} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Platforms Dropdown con búsqueda interna */}
              <div className="relative">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1.5">
                  Platforms
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown((prev) => (prev === 'platforms' ? null : 'platforms'));
                    setPlatformFilterText('');
                  }}
                  className={`w-full h-[42px] rounded-xl px-3.5 text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${selectedPlatforms.length > 0
                      ? 'bg-primary-yellow/15 text-primary-yellow'
                      : 'bg-primary-navy text-gray-200 hover:bg-primary-navy-light'
                    }`}
                >
                  <span className="truncate">
                    {selectedPlatforms.length === 0
                      ? 'All Platforms'
                      : `${selectedPlatforms.length} selected`}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${openDropdown === 'platforms' ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {openDropdown === 'platforms' && (
                  <div className="absolute left-0 z-50 mt-2 w-64 rounded-2xl bg-[#161b29] p-2 shadow-2xl shadow-black/80">
                    <div className="px-1 pb-2">
                      <input
                        type="text"
                        value={platformFilterText}
                        onChange={(e) => setPlatformFilterText(e.target.value)}
                        placeholder="Filter platforms..."
                        autoFocus
                        className="w-full rounded-xl bg-primary-navy px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
                      {filteredPlatformOptions.map((platform) => {
                        const checked = selectedPlatforms.includes(platform.id);
                        return (
                          <button
                            key={platform.id}
                            type="button"
                            onClick={() => togglePlatform(platform.id)}
                            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${checked
                                ? 'bg-primary-yellow/15 text-primary-yellow'
                                : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                              }`}
                          >
                            <span className="truncate">{platform.name}</span>
                            {checked && <Check size={14} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1.5">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === 'types' ? null : 'types'))}
                  className={`w-full h-[42px] rounded-xl px-3.5 text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${selectedGameTypes.length > 0
                      ? 'bg-primary-yellow/15 text-primary-yellow'
                      : 'bg-primary-navy text-gray-200 hover:bg-primary-navy-light'
                    }`}
                >
                  <span className="truncate">
                    {selectedGameTypes.length === 0
                      ? 'All Categories'
                      : `${selectedGameTypes.length} selected`}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${openDropdown === 'types' ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {openDropdown === 'types' && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl bg-[#161b29] p-2 shadow-2xl shadow-black/80 space-y-0.5">
                    {GAME_TYPES.map((type) => {
                      const checked = selectedGameTypes.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleGameType(type.id)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${checked
                              ? 'bg-primary-yellow/15 text-primary-yellow'
                              : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                            }`}
                        >
                          <span>{type.name}</span>
                          {checked && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chips de filtros activos + Reset */}
            {(activeFiltersCount > 0 || activeFilterChips.length > 0) && (
              <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 mr-1">
                    <SlidersHorizontal size={13} />
                    Active:
                  </span>
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] px-2.5 py-1 text-xs font-medium text-gray-200 transition-colors cursor-pointer"
                    >
                      <span>{chip.label}</span>
                      <X size={12} className="text-gray-400" />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary-yellow hover:bg-primary-yellow/10 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  Reset all
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contador de resultados */}
        <div className="mb-5 flex items-center justify-between text-xs sm:text-sm text-gray-400">
          <span>
            {loading
              ? 'Loading games...'
              : `Showing ${games.length} ${games.length === 1 ? 'game' : 'games'}${searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ''
              }`}
          </span>
        </div>

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
          <div className="rounded-2xl bg-primary-navy-dark p-12 text-center space-y-3">
            <p className="text-base font-bold text-white">No games found</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              No titles match your current search or filter combination.
            </p>
            {(activeFiltersCount > 0 || searchQuery.trim()) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary-yellow px-4 py-2 text-xs font-bold text-primary-navy hover:bg-yellow-300 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
              {games.map((game) => {
                const releaseThreshold = game.first_release_date
                  ? game.first_release_date * 1000 + 24 * 60 * 60 * 1000
                  : null;
                const isEffectivelyUnreleased =
                  !releaseThreshold || releaseThreshold > Date.now();

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
                  type="button"
                  onClick={() => fetchGames(false)}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-primary-yellow text-primary-navy rounded-xl font-bold text-sm hover:bg-yellow-300 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {loadingMore ? 'Loading more...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Explore;