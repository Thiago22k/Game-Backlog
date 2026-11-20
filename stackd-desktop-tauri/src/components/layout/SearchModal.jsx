import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  History,
  ArrowRight,
  Compass,
  Sparkles,
  Star,
  CornerDownLeft,
  SearchX,
} from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import { getGameCover, PLACEHOLDER_COVER } from '../../utils/formatters';

const CATEGORY_BADGES = {
  0: { label: 'MAIN', cls: 'bg-white/10 text-gray-200' },
  1: { label: 'DLC', cls: 'bg-primary-yellow/15 text-primary-yellow' },
  2: { label: 'EXPANSION', cls: 'bg-purple-400/15 text-purple-300' },
  3: { label: 'BUNDLE', cls: 'bg-primary-cyan/15 text-primary-cyan' },
  4: { label: 'STANDALONE', cls: 'bg-purple-400/15 text-purple-300' },
  5: { label: 'MOD', cls: 'bg-emerald-400/15 text-emerald-300' },
  6: { label: 'EPISODE', cls: 'bg-white/10 text-gray-300' },
  7: { label: 'SEASON', cls: 'bg-white/10 text-gray-300' },
  8: { label: 'REMAKE', cls: 'bg-amber-500/20 text-amber-300' },
  9: { label: 'REMASTER', cls: 'bg-primary-cyan/15 text-primary-cyan' },
  10: { label: 'EXPANDED', cls: 'bg-purple-400/15 text-purple-300' },
  11: { label: 'PORT', cls: 'bg-sky-400/15 text-sky-300' },
  12: { label: 'FORK', cls: 'bg-white/10 text-gray-300' },
  13: { label: 'PACK', cls: 'bg-white/10 text-gray-300' },
  14: { label: 'UPDATE', cls: 'bg-white/10 text-gray-300' },
};

const RECENT_SEARCHES_KEY = 'stackd_recent_searches';
const MAX_RECENT_SEARCHES = 6;
const sessionSearchCache = new Map();

const normalizeText = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const highlightMatch = (text, query) => {
  const q = query.trim();
  if (!q) return text;
  const idx = normalizeText(text).indexOf(normalizeText(q));
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-primary-yellow">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
};

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [liveStatus, setLiveStatus] = useState('');

  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Cargar historial reciente y gestionar foco al abrir/cerrar
  useEffect(() => {
    if (!isOpen) return;

    lastFocusedRef.current = document.activeElement;
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      setRecentSearches(Array.isArray(saved) ? saved : []);
    } catch {
      setRecentSearches([]);
    }

    setQuery('');
    setResults([]);
    setActiveIndex(0);
    setLiveStatus('');

    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = '';
      lastFocusedRef.current?.focus?.();
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
        // Ignorar errores de cuota
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

  const clearAllRecents = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
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
      setActiveIndex(0);
      setLiveStatus('');
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (sessionSearchCache.has(cacheKey)) {
      const cached = sessionSearchCache.get(cacheKey);
      setResults(cached);
      setLoading(false);
      setActiveIndex(0);
      setLiveStatus(
        cached.length ? `${cached.length} results for ${trimmed}` : `No results for ${trimmed}`
      );
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await axios.get(
          `${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        const games = (response.data?.games || []).slice(0, 8);
        sessionSearchCache.set(cacheKey, games);
        setResults(games);
        setActiveIndex(0);
        setLiveStatus(
          games.length ? `${games.length} results for ${trimmed}` : `No results for ${trimmed}`
        );
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          console.error('Search error:', error);
          setResults([]);
          setActiveIndex(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 240);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  // Lista unificada de ítems navegables con teclado
  const navigableItems = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return recentSearches.map((term) => ({ type: 'recent', term }));
    }
    if (loading) return [];
    return [
      ...results.map((game) => ({ type: 'game', game })),
      { type: 'explore', term: trimmed },
    ];
  }, [query, recentSearches, loading, results]);

  // Scroll automático al elemento activo
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`#search-opt-${activeIndex}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleSelectGame = useCallback(
    (game) => {
      saveRecentSearch(query.trim() || game.name);
      navigate(`/game/${game.slug || game.id}`);
      onClose();
    },
    [navigate, onClose, query, saveRecentSearch]
  );

  const handleExploreAll = useCallback(
    (searchTerm) => {
      const clean = (searchTerm ?? query).trim();
      if (!clean) return;
      saveRecentSearch(clean);
      navigate(`/explore?search=${encodeURIComponent(clean)}`);
      onClose();
    },
    [navigate, onClose, query, saveRecentSearch]
  );

  const chooseIndex = useCallback(
    (index) => {
      const target = navigableItems[index];
      if (!target) return;
      if (target.type === 'recent') {
        setQuery(target.term);
        setActiveIndex(0);
        inputRef.current?.focus();
        return;
      }
      if (target.type === 'game') {
        handleSelectGame(target.game);
        return;
      }
      if (target.type === 'explore') {
        handleExploreAll(target.term);
      }
    },
    [navigableItems, handleSelectGame, handleExploreAll]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown' && navigableItems.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % navigableItems.length);
      return;
    }

    if (e.key === 'ArrowUp' && navigableItems.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + navigableItems.length) % navigableItems.length);
      return;
    }

    if (e.key === 'Enter' && document.activeElement === inputRef.current) {
      e.preventDefault();
      if (navigableItems.length > 0 && activeIndex >= 0) {
        chooseIndex(activeIndex);
      } else if (query.trim()) {
        handleExploreAll(query);
      }
      return;
    }

    // Trampa de foco dentro del diálogo
    if (e.key === 'Tab' && dialogRef.current) {
      const focusables = [
        ...dialogRef.current.querySelectorAll('button:not([tabindex="-1"]), input'),
      ].filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!isOpen) return null;

  const trimmedQuery = query.trim();

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm sm:p-6 sm:pt-[9vh]"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search Stackd"
        onKeyDown={handleKeyDown}
        className="flex h-dvh w-full max-w-2xl flex-col overflow-hidden bg-primary-navy-dark text-white shadow-2xl shadow-black/70 sm:h-auto sm:max-h-[78vh] sm:rounded-3xl"
      >
        {/* Campo de búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results-list"
            aria-autocomplete="list"
            aria-activedescendant={navigableItems.length > 0 ? `search-opt-${activeIndex}` : ''}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games, DLCs, mods..."
            aria-label="Search games"
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-gray-400 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.07] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="h-9 shrink-0 rounded-lg bg-white/[0.07] px-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/[0.12] hover:text-white cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Separador sutil del input */}
        <div className="h-px bg-white/[0.06]" />

        {/* Contenido / Listbox */}
        <div
          ref={listRef}
          id="search-results-list"
          role="listbox"
          aria-label="Results"
          className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3 custom-scrollbar"
        >
          {/* ESTADO INICIAL: Accesos rápidos + Búsquedas recientes */}
          {!trimmedQuery && (
            <>
              <div className="grid gap-2 p-1 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/explore');
                    onClose();
                  }}
                  className="group flex items-center gap-3 rounded-2xl bg-primary-navy p-3.5 text-left transition-colors hover:bg-primary-navy-light cursor-pointer"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-yellow/15 text-primary-yellow">
                    <Compass className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">Explore catalog</span>
                    <span className="block text-xs text-gray-400">
                      Discover thousands of games
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate('/recommendations');
                    onClose();
                  }}
                  className="group flex items-center gap-3 rounded-2xl bg-primary-navy p-3.5 text-left transition-colors hover:bg-primary-navy-light cursor-pointer"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-cyan/15 text-primary-cyan">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">Recommendations</span>
                    <span className="block text-xs text-gray-400">
                      Picked based on your library
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </button>
              </div>

              {recentSearches.length > 0 ? (
                <>
                  <div className="mt-3 flex items-center justify-between px-3 pb-1.5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                      Recent searches
                    </h2>
                    <button
                      type="button"
                      onClick={clearAllRecents}
                      className="rounded-md px-1.5 py-1 text-xs font-medium text-gray-400 transition-colors hover:text-white cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>

                  {recentSearches.map((term, idx) => {
                    const isSelected = activeIndex === idx;
                    return (
                      <div
                        key={term}
                        id={`search-opt-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseMove={() => {
                          if (activeIndex !== idx) setActiveIndex(idx);
                        }}
                        onClick={() => chooseIndex(idx)}
                        className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                          }`}
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-navy text-gray-400">
                          <History className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-100">
                          {term}
                        </span>
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => removeRecentSearch(e, term)}
                          aria-label={`Remove "${term}" from recent searches`}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-400 opacity-60 transition-colors hover:bg-white/[0.08] hover:text-white hover:opacity-100 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="px-3 py-8 text-center text-sm text-gray-400">
                  No recent searches yet.
                </p>
              )}
            </>
          )}

          {/* SKELETON MIENTRAS BUSCA */}
          {trimmedQuery && loading && (
            <div className="space-y-1.5 p-1">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-2xl p-2.5 animate-pulse"
                >
                  <div className="h-14 w-11 shrink-0 rounded-lg bg-primary-navy" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-primary-navy" />
                    <div className="h-3 w-1/3 rounded bg-primary-navy/70" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RESULTADOS DE BÚSQUEDA */}
          {trimmedQuery && !loading && (
            <>
              {results.length > 0 ? (
                <>
                  <h2 className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Games · {results.length}
                  </h2>

                  {results.map((game, idx) => {
                    const isSelected = activeIndex === idx;
                    const releaseYear = game.first_release_date
                      ? new Date(game.first_release_date * 1000).getUTCFullYear()
                      : null;
                    const primaryGenre = game.genres?.[0]?.name;
                    const platforms = game.platforms?.slice(0, 3) || [];
                    const extraPlatforms = (game.platforms?.length || 0) - 3;

                    const isEdition =
                      (game.game_type === 0 || game.game_type === undefined) &&
                      (game.version_parent || game.parent_game);

                    const badge = isEdition
                      ? { label: 'EDITION', cls: 'bg-primary-cyan/15 text-primary-cyan' }
                      : CATEGORY_BADGES[game.game_type || 0];

                    return (
                      <div
                        key={game.id}
                        id={`search-opt-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseMove={() => {
                          if (activeIndex !== idx) setActiveIndex(idx);
                        }}
                        onClick={() => chooseIndex(idx)}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                          }`}
                      >
                        <img
                          src={getGameCover(game)}
                          alt={game.name}
                          className="h-14 w-11 shrink-0 rounded-lg bg-primary-navy object-cover"
                          onError={(e) => {
                            e.target.src = PLACEHOLDER_COVER;
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 truncate text-sm font-semibold text-white">
                              {highlightMatch(game.name, query)}
                            </span>
                            {badge && badge.label !== 'MAIN' && (
                              <span
                                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                            {releaseYear && <span className="tabular-nums">{releaseYear}</span>}
                            {releaseYear && primaryGenre && <span aria-hidden="true">·</span>}
                            {primaryGenre && <span>{primaryGenre}</span>}
                          </div>

                          {platforms.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {platforms.map((p) => (
                                <span
                                  key={p.id || p.name}
                                  className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-medium text-gray-400"
                                >
                                  {p.name}
                                </span>
                              ))}
                              {extraPlatforms > 0 && (
                                <span className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                                  +{extraPlatforms}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ml-2 flex shrink-0 items-center gap-3">
                          {game.rating ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary-yellow/15 px-2 py-0.5 text-xs font-bold text-primary-yellow tabular-nums">
                              <Star className="h-3 w-3 fill-primary-yellow" />
                              {Math.round(game.rating)}
                            </span>
                          ) : null}
                          <CornerDownLeft
                            className={`hidden h-4 w-4 shrink-0 sm:block transition-colors ${isSelected ? 'text-primary-yellow' : 'text-gray-500'
                              }`}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="px-3 py-8 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-navy text-gray-400">
                    <SearchX className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-white">
                    No results found for “{trimmedQuery}”
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Try searching in Explore to browse the full database.
                  </p>
                </div>
              )}

              {/* Fila final: continuar en Explore */}
              {(() => {
                const exploreIdx = results.length;
                const isExploreSelected = activeIndex === exploreIdx;
                return (
                  <>
                    <div className="mx-1 mt-2 pt-1" />
                    <div
                      id={`search-opt-${exploreIdx}`}
                      role="option"
                      aria-selected={isExploreSelected}
                      onMouseMove={() => {
                        if (activeIndex !== exploreIdx) setActiveIndex(exploreIdx);
                      }}
                      onClick={() => chooseIndex(exploreIdx)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${isExploreSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                        }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-yellow/15 text-primary-yellow">
                        <Compass className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-200">
                        Search <span className="font-semibold text-white">“{trimmedQuery}”</span> in Explore
                      </span>
                      <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
                        View all results
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>

        {/* Pie con atajos de teclado */}
        <div className="hidden items-center gap-4 bg-primary-navy/60 px-5 py-2.5 text-xs text-gray-400 sm:flex">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-white/[0.07] px-1.5 py-0.5 text-gray-300">↑</kbd>
            <kbd className="rounded bg-white/[0.07] px-1.5 py-0.5 text-gray-300">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-white/[0.07] px-1.5 py-0.5 text-gray-300">↵</kbd>
            open
          </span>
          {trimmedQuery && !loading && (
            <span className="ml-auto tabular-nums" aria-hidden="true">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>
      </div>

      {/* Región accesible para lectores de pantalla */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveStatus}
      </div>
    </div>
  );
};

export default SearchModal;