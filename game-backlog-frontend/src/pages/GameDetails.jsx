import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Check, Play, ShoppingCart, Trash2, Calendar, Clock, Tag, Building2, ExternalLink, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import NotFound from '../pages/NotFound';
import GameLikeButton from '../components/games/GameLikeButton';
import { getGameBanner, getGameCover, formatIGDBImage, formatReleaseDate } from '../utils/formatters';
// ─── Constants ───────────────────────────────────────────────────────────────
const STATUSES = [
  { id: 'playing', label: 'Playing', Icon: Play, color: 'bg-blue-600 hover:bg-blue-500', activeRing: 'ring-blue-400' },
  { id: 'completed', label: 'Completed', Icon: Check, color: 'bg-green-600 hover:bg-green-500', activeRing: 'ring-green-400' },
  { id: 'wishlist', label: 'Wishlist', Icon: ShoppingCart, color: 'bg-cyan-600 hover:bg-cyan-500', activeRing: 'ring-cyan-400' },
  { id: 'backlog', label: 'Backlog', Icon: Archive, color: 'bg-purple-600 hover:bg-purple-500', activeRing: 'ring-purple-400' },
  { id: 'dropped', label: 'Dropped', Icon: Trash2, color: 'bg-red-600 hover:bg-red-500', activeRing: 'ring-red-400' },
];
// ─── Sub-components ──────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">{children}</h2>
);
const InfoRow = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
    <div className="text-gray-200 text-sm">{children}</div>
  </div>
);
/** Star widget — Lucide Star with half-star support */
const InlineStarRating = ({ rating, onRate, interactive }) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered || Number(rating) || 0;

  const getColor = (value) => {
    if (value <= 2) return '#ef4444';
    if (value <= 3.5) return '#f97316';
    return '#22c55e';
  };
  const accentColor = display > 0 ? getColor(display) : '#6b7280';

  const getFill = (star) => {
    if (display >= star) return 'full';
    if (display >= star - 0.5) return 'half';
    return 'empty';
  };

  const handleMouseMove = (e, star) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHovered(e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star);
  };

  const handleClick = (e, star) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onRate(e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star);
  };

  return (
    <div
      className="flex items-center gap-2"
      onMouseLeave={() => interactive && setHovered(0)}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = getFill(star);
          return (
            <div
              key={star}
              className={`relative w-7 h-7 ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
              onMouseMove={(e) => handleMouseMove(e, star)}
              onClick={(e) => handleClick(e, star)}
            >
              {/* Base — gray */}
              <Star size={28} className="absolute inset-0" style={{ color: '#374151', fill: '#374151' }} />
              {/* Filled overlay */}
              {fill !== 'empty' && (
                <span
                  className="absolute inset-0 overflow-hidden transition-all duration-100"
                  style={{ clipPath: fill === 'half' ? 'inset(0 50% 0 0)' : 'none' }}
                >
                  <Star size={28} style={{ color: accentColor, fill: accentColor }} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {display > 0 ? (
        <span className="text-sm text-gray-400">{display}/5</span>
      ) : interactive ? (
        <span className="text-sm text-gray-500">No rating yet</span>
      ) : null}
    </div>
  );
};
// ─── Main page ────────────────────────────────────────────────────────────────
const GameDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addGame, updateGame, deleteGame, getUserGames } = useGames();
  const [game, setGame] = useState(null);
  const [userGame, setUserGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [banner, setBanner] = useState(null);

  // ── Fetch Game Data ──────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchGameData = async () => {
      setLoading(true);
      setError(null);
      try {
        const gameRes = await axios.get(`${ENDPOINTS.GAMES.SEARCH.replace('/search', '')}/igdb/${slug}`);
        if (!isMounted) return;
        const gameData = gameRes.data.game;
        setGame(gameData);
        setBanner(getGameBanner(gameData));
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading game:', err);
        // Assuming any fetch failure means game wasn't found in DB/IGDB
        setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchGameData();
    return () => {
      isMounted = false;
      setBanner(null);
    };
  }, [slug]);

  // ── Fetch User Game ──────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchUserGame = async () => {
      if (!isAuthenticated || !game?.id) {
        setUserGame(null);
        return;
      }
      try {
        const userRes = await getUserGames();
        if (!isMounted) return;
        if (userRes.success) {
          const found = userRes.data.find((g) => g.igdb_game_id === game.id);
          setUserGame(found || null);
        }
      } catch (err) {
        console.error('Error loading user game:', err);
      }
    };
    fetchUserGame();
    return () => { isMounted = false; };
  }, [game?.id, isAuthenticated]);
  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStatusSelect = useCallback(async (statusId) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!game?.id) return;
    setSaving(true);
    try {
      if (statusId === null) {
        // Remove from list
        const result = await deleteGame(game.id);
        if (result.success) {
          toast.success('Removed from your list');
          setUserGame(null);
        } else {
          toast.error('Error removing game');
        }
      } else if (userGame) {
        // Update existing
        const result = await updateGame(game.id, statusId, userGame.rating);
        if (result.success) {
          toast.success(`Status updated to "${statusId}"`);
          setUserGame((prev) => ({ ...prev, status: statusId }));
        } else {
          toast.error('Error updating status');
        }
      } else {
        // Add new
        const result = await addGame(game.id, statusId);
        if (result.success) {
          toast.success('Added to your list!');
          const refreshed = await getUserGames();
          if (refreshed.success) {
            const found = refreshed.data.find((g) => g.igdb_game_id === game.id);
            setUserGame(found || null);
          }
        } else {
          toast.error('Error adding game');
        }
      }
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, userGame, game?.id, addGame, updateGame, deleteGame, navigate]);
  const handleRatingChange = useCallback(async (rating) => {
    if (!isAuthenticated || !userGame || !game?.id) return;
    setSaving(true);
    try {
      const result = await updateGame(game.id, userGame.status, rating);
      if (result.success) {
        toast.success(`Rating saved: ${rating} ⭐`);
        setUserGame((prev) => ({ ...prev, rating }));
      } else {
        toast.error('Error saving rating');
      }
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, userGame, game?.id, updateGame]);
  // ── Derived values (Must be before early returns to follow Rules of Hooks) ────
  const cover = useMemo(() => game ? getGameCover(game) : null, [game]);
  const igdbScore = useMemo(() => game?.rating ? Math.round(game.rating) : null, [game]);
  const developer = useMemo(() => game?.involved_companies
    ?.filter((ic) => ic.developer)
    .map((ic) => ic.company.name)
    .join(', ') || null, [game]);
  const publisher = useMemo(() => game?.involved_companies
    ?.filter((ic) => ic.publisher)
    .map((ic) => ic.company.name)
    .join(', ') || null, [game]);
  const screenshots = useMemo(() => game?.screenshots?.slice(0, 9) ?? [], [game]);
  const similarGames = useMemo(() => game?.similar_games?.slice(0, 6) ?? [], [game]);
  const summary = useMemo(() => game?.summary || game?.storyline, [game]);
  // A game is "unreleased" if it has no release date yet, or its release date is in the future
  const isUnreleased = useMemo(() => !game?.first_release_date || game.first_release_date > Date.now() / 1000, [game]);

  // ── Loading / error states (After all React hooks have been called) ───────────
  if (loading) {
    return (
      <div className="min-h-screen bg-primary-navy">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-yellow" />
        </div>
      </div>
    );
  }

  if (error || !game || !game.name) {
    return (
      <div className="min-h-screen bg-primary-navy">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <p className="text-gray-400 mb-6 text-lg">{error || 'Game not found'}</p>
            <button
              onClick={() => navigate('/explore')}
              className="bg-primary-yellow text-primary-navy-dark px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Back to Explore
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {banner && (
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${banner})` }}
          >
            <div className="absolute inset-0 bg-primary-navy/80 backdrop-blur-sm" />
          </div>
        )}
        {!banner && <div className="absolute inset-0 bg-primary-navy-dark" />}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-8 text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover with translucent action bar */}
            <div className="shrink-0 relative">
              <img
                src={cover}
                alt={game.name}
                className="w-44 h-64 object-cover rounded-xl shadow-2xl ring-2 ring-white/10"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover'; }}
              />
              {/* Translucent bottom bar: Like (left) + IGDB score (right) */}
              <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/50 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
                <GameLikeButton
                  igdbGameId={game.id}
                  gameName={game.name}
                  coverUrl={game.cover?.image_id}
                  size="sm"
                  showCount={true}
                />
                {igdbScore && (
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-primary-yellow leading-none">{igdbScore}</span>
                    <span className="text-[10px] text-gray-400 leading-none mt-0.5">IGDB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title & meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-3">
                {game.name}
              </h1>

              {/* Genre pills + Upcoming badge */}
              <div className="flex flex-wrap gap-2 mb-4">
                {isUnreleased && (
                  <button
                    onClick={() => navigate('/explore?anticipated=true')}
                    className="px-3 py-1 bg-primary-yellow text-primary-navy-dark text-xs font-bold rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <Clock size={11} />
                    Upcoming
                  </button>
                )}
                {game.genres?.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/explore?genres=${g.id}`)}
                    className="px-3 py-1 bg-primary-yellow/20 text-primary-yellow text-xs font-semibold rounded-full border border-primary-yellow/30 hover:bg-primary-yellow/30 transition-colors cursor-pointer"
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              {/* Compact meta line: dev · publisher · date */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 mb-4">
                {developer && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-gray-500" />
                      {developer}
                    </span>
                    <span className="text-gray-600">·</span>
                  </>
                )}
                {publisher && publisher !== developer && (
                  <>
                    <span>{publisher}</span>
                    <span className="text-gray-600">·</span>
                  </>
                )}
                {game.first_release_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-500" />
                    {formatReleaseDate(game.first_release_date)}
                  </span>
                )}
              </div>


              {/* Platforms */}
              {game.platforms?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {game.platforms.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/explore?platforms=${p.id}`)}
                      className="px-2 py-0.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-xs rounded border border-gray-700 focus:outline-none"
                      title={`Explore games on ${p.name}`}
                    >
                      {p.name}
                    </button>
                  ))}
                  {game.platforms.length > 8 && (
                    <span className="text-xs text-gray-500 self-center">+{game.platforms.length - 8} more</span>
                  )}
                </div>
              )}

              {/* Description — plain text, no box, flush with platforms */}
              {summary && (
                <InlineSummary summary={summary} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* My Library — Status + Rating + Like */}
            <div className="bg-primary-navy-dark rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">My Status</p>

                {isAuthenticated ? (
                  <div className={saving ? 'opacity-60 pointer-events-none' : ''}>
                    {isUnreleased ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-400 text-center">
                          This game hasn't released yet. Add it to your wishlist to keep track of it.
                        </p>
                        <button
                          onClick={() => handleStatusSelect(userGame?.status === 'wishlist' ? null : 'wishlist')}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white transition-all ${userGame?.status === 'wishlist'
                            ? 'bg-cyan-600 ring-2 ring-cyan-400 scale-[1.01]'
                            : 'bg-gray-700 hover:bg-cyan-600 border border-gray-600'
                            }`}
                        >
                          <ShoppingCart size={16} />
                          {userGame?.status === 'wishlist' ? 'In Wishlist ✓' : 'Add to Wishlist'}
                        </button>
                        {userGame?.status === 'wishlist' && (
                          <button
                            onClick={() => handleStatusSelect(null)}
                            className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-center"
                          >
                            Remove from my list
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Status grid — wider on left column, 5 cols */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                          {STATUSES.map(({ id: sid, label, Icon, color, activeRing }) => {
                            const isActive = userGame?.status === sid;
                            return (
                              <button
                                key={sid}
                                onClick={() => handleStatusSelect(isActive ? null : sid)}
                                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-semibold text-white transition-all ${color} ${isActive ? `ring-2 ${activeRing} scale-[1.03]` : 'opacity-60 hover:opacity-100'}`}
                              >
                                <Icon size={18} />
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Remove */}
                        {userGame && (
                          <button
                            onClick={() => handleStatusSelect(null)}
                            className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-center mb-4"
                          >
                            Remove from my list
                          </button>
                        )}

                        {/* Rating */}
                        {userGame ? (
                          <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">My Rating</p>
                            <InlineStarRating
                              rating={userGame.rating || 0}
                              onRate={handleRatingChange}
                              interactive={true}
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 text-center">Add this game to your list to rate it</p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm mb-4">Sign in to track this game and rate it</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full bg-primary-yellow text-primary-navy-dark py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <div className="bg-primary-navy-dark rounded-2xl p-6">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">Screenshots</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {screenshots.map((s) => (
                    <img
                      key={s.id}
                      src={formatIGDBImage(s.url, 't_screenshot_med')}
                      alt="Screenshot"
                      className="w-full h-36 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Similar games */}
            {similarGames.length > 0 && (
              <div className="bg-primary-navy-dark rounded-2xl p-6">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">You Might Also Like</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {similarGames.map((sg) => (
                    <div
                      key={sg.id}
                      onClick={() => navigate(`/game/${sg.slug || sg.id}`)}
                      className="cursor-pointer group"
                    >
                      <img
                        src={getGameCover(sg)}
                        alt={sg.name}
                        className="w-full aspect-[3/4] object-cover rounded-lg group-hover:ring-2 group-hover:ring-primary-yellow transition-all"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover'; }}
                      />
                      <p className="mt-1.5 text-xs text-gray-400 truncate group-hover:text-white transition-colors">
                        {sg.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* ── DETAILS — only non-duplicate info ─────────────────── */}
            {(game.game_modes?.length > 0 || game.websites?.find((w) => w.category === 1)) && (
              <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-5 space-y-4">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Details</p>

                {game.game_modes?.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Game Modes</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {game.game_modes.map((m) => (
                        <span key={m.id} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {game.websites?.find((w) => w.category === 1) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Official Site</span>
                    <a
                      href={game.websites.find((w) => w.category === 1).url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary-yellow hover:underline text-sm"
                    >
                      <ExternalLink size={13} />
                      Visit website
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Description with expand/collapse (no header label) ───────────────────────
const DescriptionSection = ({ summary }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = summary.length > 350;
  const display = expanded || !isLong ? summary : `${summary.slice(0, 350)}…`;
  return (
    <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6">
      <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">{display}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-primary-yellow hover:underline font-medium text-sm"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
};

export default GameDetails;

// ─── Inline description in the Hero — no card, raw text ────────────────────
const InlineSummary = ({ summary }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = summary.length > 300;
  const display = expanded || !isLong ? summary : `${summary.slice(0, 300)}…`;
  return (
    <div className="mt-5">
      <p className="text-gray-400 leading-relaxed text-sm whitespace-pre-line">{display}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-primary-yellow hover:underline text-xs font-medium"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
};
