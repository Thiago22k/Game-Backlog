import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, ArrowUpRight, Compass, Sparkles, Star } from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import { getGameCover, PLACEHOLDER_COVER } from '../../utils/formatters';

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
  14: 'Update',
};

const RECENT_SEARCHES_KEY = 'stackd_recent_searches';
const MAX_RECENT_SEARCHES = 5;

// Caché en memoria de sesión para respuestas instantáneas al retroceder o repetir consulta
const sessionSearchCache = new Map();

const highlightMatch = (text, query) => {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <span key={idx} className="text-primary-yellow font-bold">
        {part}
      </span>
    ) : (
      part
    )
  );
};

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);

  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Cargar historial reciente al abrir y enfocar input
  useEffect(() => {
    if (!isOpen) return;

    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      setRecentSearches(Array.isArray(saved) ? saved : []);
    } catch {
      setRecentSearches([]);
    }

    setSelectedIndex(-1);
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const saveRecentSearch = useCallback((term) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const updated = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignorar errores de cuota de storage
      }
      return updated;
    });
  }, []);

  const removeRecentSearch = (e, term) => {
    e.stopPropagation();
    const updated = recentSearches.filter((item) => item !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignorar
    }
  };

  // Búsqueda con debounce, caché en sesión y AbortController
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (sessionSearchCache.has(cacheKey)) {
      setResults(sessionSearchCache.get(cacheKey));
      setLoading(false);
      setSelectedIndex(0);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await axios.get(`${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const games = (response.data?.games || []).slice(0, 8);
        sessionSearchCache.set(cacheKey, games);
        setResults(games);
        setSelectedIndex(games.length > 0 ? 0 : -1);
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          console.error('Search error:', error);
          setResults([]);
          setSelectedIndex(-1);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 260);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  // Mantener visible el elemento seleccionado con teclado
  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-result-index="${selectedIndex}"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleGameClick = useCallback(
    (game) => {
      saveRecentSearch(query || game.name);
      navigate(`/game/${game.slug || game.id}`);
      onClose();
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    },
    [navigate, onClose, query, saveRecentSearch]
  );

  const handleExploreAll = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    navigate(`/explore?search=${encodeURIComponent(trimmed)}`);
    onClose();
    setQuery('');
    setResults([]);
  }, [navigate, onClose, query, saveRecentSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        handleExploreAll();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleGameClick(results[selectedIndex]);
      } else {
        handleExploreAll();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center pt-16 sm:pt-28 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-primary-navy border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center px-5 py-4 border-b border-gray-800">
          <Search className="text-gray-400 mr-3 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games by title..."
            className="flex-1 bg-transparent text-white text-base sm:text-lg outline-none placeholder-gray-500 min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setSelectedIndex(-1);
                inputRef.current?.focus();
              }}
              title="Clear search"
              className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition-colors mr-1"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close (ESC)"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div ref={listRef} className="max-h-[26rem] overflow-y-auto custom-scrollbar">
          {/* Skeleton mientras busca */}
          {loading && (
            <div className="py-2 divide-y divide-white/[0.04]">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center px-5 py-3 animate-pulse">
                  <div className="w-11 h-14 bg-white/10 rounded shrink-0" />
                  <div className="ml-4 flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sin resultados */}
          {!loading && query.trim() && results.length === 0 && (
            <div className="py-10 px-6 text-center">
              <p className="text-gray-300 font-medium mb-1">No games found for "{query.trim()}"</p>
              <p className="text-xs text-gray-500">Try checking the spelling or using fewer keywords</p>
            </div>
          )}

          {/* Resultados */}
          {!loading && results.length > 0 && (
            <div className="py-1.5">
              {results.map((game, index) => {
                const isSelected = index === selectedIndex;
                const releaseYear = game.first_release_date
                  ? new Date(game.first_release_date * 1000).getUTCFullYear()
                  : null;
                const primaryGenre = game.genres?.[0]?.name;
                const platformsText = game.platforms
                  ?.slice(0, 3)
                  .map((p) => p.name)
                  .join(', ');
                const extraPlatforms = (game.platforms?.length || 0) - 3;

                const isEdition =
                  (game.game_type === 0 || game.game_type === undefined) &&
                  (game.version_parent || game.parent_game);
                const categoryLabel = isEdition ? 'Edition' : CATEGORIES[game.game_type || 0];

                return (
                  <button
                    key={game.id}
                    type="button"
                    data-result-index={index}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => handleGameClick(game)}
                    className={`w-full flex items-center px-5 py-2.5 transition-colors text-left ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                      }`}
                  >
                    <img
                      src={getGameCover(game)}
                      alt={game.name}
                      className="w-11 h-14 object-cover rounded shadow shrink-0 ring-1 ring-white/10"
                      onError={(e) => {
                        e.target.src = PLACEHOLDER_COVER;
                      }}
                    />

                    <div className="ml-3.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm sm:text-base truncate">
                          {highlightMatch(game.name, query)}
                        </p>
                        {categoryLabel && categoryLabel !== 'Main Game' && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-gray-800/90 text-gray-400 text-[10px] uppercase tracking-wider font-bold rounded border border-gray-700 leading-none">
                            {categoryLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-1">
                        {releaseYear && <span className="text-gray-300 font-medium">{releaseYear}</span>}
                        {primaryGenre && (
                          <>
                            {releaseYear && <span className="text-gray-600">•</span>}
                            <span>{primaryGenre}</span>
                          </>
                        )}
                        {platformsText && (
                          <>
                            {(releaseYear || primaryGenre) && <span className="text-gray-600">•</span>}
                            <span className="truncate max-w-[240px]">
                              {platformsText}
                              {extraPlatforms > 0 ? ` +${extraPlatforms}` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="ml-3 flex items-center gap-3 shrink-0">
                      {game.rating ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-yellow/10 border border-primary-yellow/25 text-primary-yellow text-xs font-bold">
                          <Star size={11} className="fill-primary-yellow" />
                          {Math.round(game.rating)}
                        </span>
                      ) : null}
                      <ArrowUpRight
                        size={16}
                        className={`transition-transform ${isSelected ? 'text-primary-yellow translate-x-0.5 -translate-y-0.5' : 'text-gray-600'
                          }`}
                      />
                    </div>
                  </button>
                );
              })}

              {/* Acceso directo a ver todos en Explore */}
              <div className="px-5 pt-2 pb-1">
                <button
                  type="button"
                  onClick={handleExploreAll}
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-xs text-gray-300 hover:text-primary-yellow font-medium flex items-center justify-between transition-colors"
                >
                  <span>View all results for "{query.trim()}" in Explore</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Estado vacío: búsquedas recientes + accesos rápidos */}
          {!query.trim() && !loading && (
            <div className="p-5 space-y-5">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem(RECENT_SEARCHES_KEY);
                      }}
                      className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        onClick={() => setQuery(term)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-gray-300 hover:text-white cursor-pointer transition-colors"
                      >
                        <Clock size={12} className="text-gray-500" />
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(e, term)}
                          className="text-gray-500 hover:text-red-400 ml-0.5"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Quick Navigation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/explore');
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-primary-yellow/10 text-primary-yellow">
                      <Compass size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-primary-yellow transition-colors">
                        Explore Catalog
                      </p>
                      <p className="text-[11px] text-gray-500">Filter by genre, platform & year</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigate('/recommendations');
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-primary-yellow transition-colors">
                        For You Recommendations
                      </p>
                      <p className="text-[11px] text-gray-500">Personalized picks from your library</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer keyboard hints */}
        <div className="px-5 py-2.5 border-t border-gray-800 bg-black/20 flex items-center justify-between text-[11px] text-gray-500">
          <div className="hidden sm:flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">Enter</kbd> Open
            </span>
          </div>
          <span className="ml-auto">
            <kbd className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;