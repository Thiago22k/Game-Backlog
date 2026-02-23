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
/** Star widget — inline dots matching existing StarRating style */
const InlineStarRating = ({ rating, onRate, interactive }) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || rating || 0;
  const getColor = (star) => {
    if (star > active) return 'bg-gray-600';
    if (active === 1) return 'bg-red-500';
    if (active <= 3) return 'bg-orange-500';
    return 'bg-green-500';
  };
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={!interactive}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate(star)}
          className={`w-6 h-6 rounded-full transition-all ${getColor(star)} ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            }`}
        />
      ))}
      {rating ? (
        <span className="text-sm text-gray-400 ml-1">{rating}/5</span>
      ) : interactive ? (
        <span className="text-sm text-gray-500 ml-1">No rating yet</span>
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
        {/* Blurred banner background */}
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
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-8 text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover */}
            <div className="shrink-0">
              <img
                src={cover}
                alt={game.name}
                className="w-44 h-64 object-cover rounded-xl shadow-2xl ring-2 ring-white/10"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover'; }}
              />
            </div>
            {/* Title & meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
                {game.name}
              </h1>
              {/* Genres pills + Upcoming badge */}
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
              {/* IGDB Score */}
              {igdbScore && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Star className="text-primary-yellow fill-primary-yellow" size={18} />
                    <span className="text-white font-bold text-xl">{igdbScore}</span>
                    <span className="text-gray-400 text-sm">/100 IGDB</span>
                  </div>
                  <div className="flex-1 max-w-xs bg-gray-700/60 rounded-full h-2">
                    <div
                      className="bg-primary-yellow h-2 rounded-full transition-all"
                      style={{ width: `${igdbScore}%` }}
                    />
                  </div>
                </div>
              )}
              {/* Release date & companies */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                {game.first_release_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {formatReleaseDate(game.first_release_date)}
                  </span>
                )}
                {developer && (
                  <span className="flex items-center gap-1.5" title="Developer">
                    <Building2 size={14} />
                    {developer}
                  </span>
                )}
                {publisher && publisher !== developer && (
                  <span className="flex items-center gap-1.5" title="Publisher">
                    <Building2 size={14} />
                    {publisher}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Summary */}
            {summary && <SummarySection summary={summary} />}
            {/* Screenshots */}
            {screenshots.length > 0 && (
              <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6">
                <SectionTitle>Screenshots</SectionTitle>
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
              <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6">
                <SectionTitle>Similar Games</SectionTitle>
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
          <div className="space-y-6">
            {/* Status & Rating panel */}
            <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6">
              <SectionTitle>My Status</SectionTitle>
              {isAuthenticated ? (
                <div className={saving ? 'opacity-60 pointer-events-none' : ''}>
                  {isUnreleased ? (
                    /* ── UNRELEASED: wishlist-only ─────────────────────── */
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
                    /* ── RELEASED: full status + rating ────────────────── */
                    <>
                      {/* Status buttons */}
                      <div className="grid grid-cols-2 gap-2 mb-5">
                        {STATUSES.map(({ id: sid, label, Icon, color, activeRing }) => {
                          const isActive = userGame?.status === sid;
                          return (
                            <button
                              key={sid}
                              onClick={() => handleStatusSelect(isActive ? null : sid)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white transition-all ${color} ${isActive ? `ring-2 ${activeRing} scale-[1.02]` : 'opacity-70 hover:opacity-100'
                                }`}
                            >
                              <Icon size={15} />
                              {label}
                              {isActive && <Check size={13} className="ml-auto" />}
                            </button>
                          );
                        })}
                      </div>
                      {/* Remove from list button */}
                      {userGame && (
                        <button
                          onClick={() => handleStatusSelect(null)}
                          className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-center mb-5"
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
                        <p className="text-xs text-gray-500 text-center">
                          Add this game to your list to rate it
                        </p>
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
            {/* Game Info */}
            <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6 space-y-5">
              <SectionTitle>
                <Tag size={16} className="text-primary-yellow" />
                Game Info
              </SectionTitle>
              {game.first_release_date && (
                <InfoRow label="Release Date">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-500" />
                    {formatReleaseDate(game.first_release_date)}
                  </span>
                </InfoRow>
              )}
              {developer && (
                <InfoRow label="Developer">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-gray-500" />
                    {developer}
                  </span>
                </InfoRow>
              )}
              {publisher && (
                <InfoRow label="Publisher">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-gray-500" />
                    {publisher}
                  </span>
                </InfoRow>
              )}
              {game.platforms?.length > 0 && (
                <InfoRow label="Platforms">
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {game.platforms.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/explore?platforms=${p.id}`)}
                        className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-yellow"
                        title={`Explore games on ${p.name}`}
                      >
                        {p.name}
                      </button>
                    ))}
                    {game.platforms.length > 6 && (
                      <span className="text-xs text-gray-500">+{game.platforms.length - 6} more</span>
                    )}
                  </div>
                </InfoRow>
              )}
              {igdbScore && (
                <InfoRow label="IGDB Score">
                  <div className="flex items-center gap-2">
                    <Star size={14} className="text-primary-yellow fill-primary-yellow" />
                    <span className="font-bold text-white">{igdbScore}</span>
                    <span className="text-gray-500">/100</span>
                  </div>
                </InfoRow>
              )}
              {game.game_modes?.length > 0 && (
                <InfoRow label="Game Modes">
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {game.game_modes.map((m) => (
                      <span key={m.id} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">
                        {m.name}
                      </span>
                    ))}
                  </div>
                </InfoRow>
              )}
              {game.websites?.find((w) => w.category === 1) && (
                <InfoRow label="Website">
                  <a
                    href={game.websites.find((w) => w.category === 1).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary-yellow hover:underline"
                  >
                    <ExternalLink size={13} />
                    Official Site
                  </a>
                </InfoRow>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
// ─── Summary with expand/collapse ────────────────────────────────────────────
const SummarySection = ({ summary }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = summary.length > 350;
  const display = expanded || !isLong ? summary : `${summary.slice(0, 350)}…`;
  return (
    <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6">
      <SectionTitle>Summary</SectionTitle>
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