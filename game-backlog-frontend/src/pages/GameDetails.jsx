import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Building2, Calendar, Check, Plus, ShoppingCart, Info, Play, Trash2, Archive, Heart, Compass, MessageSquare, FolderPlus, LayoutDashboard, Image as ImageIcon, Layers, Pencil, Globe, Share2, Swords, Gem, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import { useGameLikes } from '../hooks/useGameLikes';
import useSEO from '../hooks/useSEO';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import NotFound from '../pages/NotFound';
import StarRating from '../components/games/StarRating';
import { getGameBanner, getGameCover, formatIGDBImage, formatReleaseDate } from '../utils/formatters';
import AddToCollectionModal from '../components/collections/AddToCollectionModal';
import ReviewsPanel from '../components/reviews/ReviewsPanel';
import ReviewModal from '../components/reviews/ReviewModal';
import reviewService from '../api/review.service';
import ScreenshotLightbox from '../components/games/ScreenshotLightbox';
import { getAgeRatingImage } from '../utils/ageRatings';
import {
  FaArrowUpRightFromSquare, FaNewspaper, FaWikipediaW, FaFacebook,
  FaTwitch, FaInstagram, FaYoutube, FaApple, FaAndroid, FaSteam,
  FaReddit, FaItchIo, FaDiscord, FaXTwitter, FaXbox, FaPlaystation
} from 'react-icons/fa6';
import { SiEpicgames, SiGogdotcom } from 'react-icons/si';
import { BsNintendoSwitch } from 'react-icons/bs';

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUSES = [
  { id: 'playing', label: 'Playing', Icon: Play, color: 'bg-blue-600 hover:bg-blue-500', activeRing: 'ring-blue-400' },
  { id: 'completed', label: 'Completed', Icon: Check, color: 'bg-green-600 hover:bg-green-500', activeRing: 'ring-green-400' },
  { id: 'wishlist', label: 'Wishlist', Icon: ShoppingCart, color: 'bg-cyan-600 hover:bg-cyan-500', activeRing: 'ring-cyan-400' },
  { id: 'backlog', label: 'Backlog', Icon: Archive, color: 'bg-purple-600 hover:bg-purple-500', activeRing: 'ring-purple-400' },
  { id: 'dropped', label: 'Dropped', Icon: Trash2, color: 'bg-red-600 hover:bg-red-500', activeRing: 'ring-red-400' },
];

const GAME_CATEGORIES = {
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

const TABS = [
  { id: 'stats', label: 'Stats', icon: LayoutDashboard },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  { id: 'details', label: 'Details', icon: Info },
  { id: 'similar', label: 'Similar', icon: Compass },
];



// ─── Pure helpers (defined once, not per render) ──────────────────────────────
const formatNumber = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const renderStars = (rating) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
};

const getWebsiteInfo = (website) => {
  const categoryId = website.category || website.type;
  switch (categoryId) {
    case 1: return { Icon: FaArrowUpRightFromSquare, label: 'Official Website', color: 'text-primary-yellow hover:underline' };
    case 2: return { Icon: FaNewspaper, label: 'Wiki', color: 'text-gray-400 hover:text-white' };
    case 3: return { Icon: FaWikipediaW, label: 'Wikipedia', color: 'text-gray-400 hover:text-white' };
    case 4: return { Icon: FaFacebook, label: 'Facebook', color: 'text-gray-400 hover:text-[#1877F2]' };
    case 5: return { Icon: FaXTwitter, label: 'X (Twitter)', color: 'text-gray-400 hover:text-white' };
    case 6: return { Icon: FaTwitch, label: 'Twitch', color: 'text-gray-400 hover:text-[#9146FF]' };
    case 8: return { Icon: FaInstagram, label: 'Instagram', color: 'text-gray-400 hover:text-[#E4405F]' };
    case 9: return { Icon: FaYoutube, label: 'YouTube', color: 'text-gray-400 hover:text-[#FF0000]' };
    case 10: return { Icon: FaApple, label: 'iPhone', color: 'text-gray-400 hover:text-white' };
    case 11: return { Icon: FaApple, label: 'iPad', color: 'text-gray-400 hover:text-white' };
    case 12: return { Icon: FaAndroid, label: 'Android', color: 'text-gray-400 hover:text-[#3DDC84]' };
    case 13: return { Icon: FaSteam, label: 'Steam', color: 'text-gray-400 hover:text-[#00adee]' };
    case 14: return { Icon: FaReddit, label: 'Reddit', color: 'text-gray-400 hover:text-[#FF4500]' };
    case 15: return { Icon: FaItchIo, label: 'Itch.io', color: 'text-gray-400 hover:text-[#FA5C5C]' };
    case 16: return { Icon: SiEpicgames, label: 'Epic Games', color: 'text-gray-400 hover:text-white' };
    case 17: return { Icon: SiGogdotcom, label: 'GOG', color: 'text-gray-400 hover:text-[#8b22a8]' };
    case 18: return { Icon: FaDiscord, label: 'Discord', color: 'text-gray-400 hover:text-[#5865F2]' };
    default:
      const url = website.url;
      const hostname = new URL(url).hostname;

      if (hostname.includes('xbox.com')) return { Icon: FaXbox, label: 'Xbox', color: 'text-gray-400 hover:text-[#107C10]' };
      if (hostname.includes('playstation.com') || hostname.includes('playstation.net')) return { Icon: FaPlaystation, label: 'PlayStation', color: 'text-gray-400 hover:text-[#003791]' };
      if (hostname.includes('nintendo.com')) return { Icon: BsNintendoSwitch, label: 'Nintendo', color: 'text-gray-400 hover:text-[#E60012]' };

      let label = hostname.replace('www.', '');
      return { Icon: FaArrowUpRightFromSquare, label, color: 'text-gray-400 hover:text-white' };
  }
};


// ─── Main page ────────────────────────────────────────────────────────────────
const GameDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addGame, updateGame, deleteGame, getUserGames } = useGames();
  const [game, setGame] = useState(null);
  const [userGame, setUserGame] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [myReview, setMyReview] = useState(null);

  const [banner, setBanner] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [lightboxState, setLightboxState] = useState({ isOpen: false, index: 0 });


  // ── SEO ──────────────────────────────────────────────────────────────────
  const seoDescription = useMemo(() => {
    if (!game) return undefined;
    const parts = [game.name];
    const dev = game?.involved_companies?.find(ic => ic.developer)?.company?.name;
    if (dev) parts.push(`by ${dev}`);
    if (game.genres?.length) parts.push(`— ${game.genres.map(g => g.name).join(', ')}`);
    const base = parts.join(' ');
    const summary = game.summary || game.storyline || '';
    return summary ? `${base}. ${summary.slice(0, 150)}` : base;
  }, [game]);

  const seoImage = useMemo(() => game ? getGameCover(game) : undefined, [game]);

  useSEO({ title: game?.name, description: seoDescription, image: seoImage });

  // ── JSON-LD Structured Data ─────────────────────────────────────────────
  useEffect(() => {
    if (!game) return;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: game.name,
      ...(game.summary && { description: game.summary }),
      ...(game.first_release_date && { datePublished: new Date(game.first_release_date * 1000).toISOString().split('T')[0] }),
      ...(game.genres?.length && { genre: game.genres.map(g => g.name) }),
      ...(game.platforms?.length && { gamePlatform: game.platforms.map(p => p.name) }),
      ...(game.involved_companies?.find(ic => ic.developer) && {
        author: { '@type': 'Organization', name: game.involved_companies.find(ic => ic.developer).company.name },
      }),
      ...(game.rating && { aggregateRating: { '@type': 'AggregateRating', ratingValue: Math.round(game.rating), bestRating: 100 } }),
      ...(seoImage && { image: seoImage }),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [game, seoImage]);

  // ── Fetch Game Data ──────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchGameData = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
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
  const fetchUserGame = useCallback(async () => {
    if (!isAuthenticated || !game?.id) {
      setUserGame(null);
      setMyReview(null);
      return;
    }
    try {
      const userRes = await getUserGames();
      if (userRes.success) {
        const found = userRes.data.find((g) => g.igdb_game_id === game.id);
        setUserGame(found || null);
      }

      // También cargar la reseña del usuario
      const reviewData = await reviewService.getMyReview(game.id);
      setMyReview(reviewData || null);
    } catch (err) {
      console.error('Error loading user game or review:', err);
    }
  }, [game?.id, isAuthenticated, getUserGames]);

  useEffect(() => {
    fetchUserGame();
  }, [fetchUserGame]);

  // ── Fetch Community Stats ─────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!game?.id) return;
    try {
      const res = await axios.get(ENDPOINTS.GAMES.GAME_STATS(game.id));
      setGameStats(res.data.stats);
    } catch (err) {
      console.error('Error loading game stats:', err);
    }
  }, [game?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
  // A game is "unreleased" if it has no release date yet, or its release date is in the future (within 12h grace period)
  const isUnreleased = useMemo(() => {
    if (!game?.first_release_date) return true;
    const releaseThreshold = (game.first_release_date * 1000) + (12 * 60 * 60 * 1000);
    return releaseThreshold > Date.now();
  }, [game]);

  // Derived category and parent game
  const categoryName = useMemo(() => {
    if (!game) return null;
    return GAME_CATEGORIES[game.game_type] || null;
  }, [game]);

  const parentGame = useMemo(() => {
    // Determine the main game link, prioritizing version_parent over parent_game
    return game?.version_parent || game?.parent_game || null;
  }, [game]);

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
      fetchStats();
    }
  }, [isAuthenticated, userGame, game?.id, addGame, updateGame, deleteGame, navigate, fetchStats]);

  const handleRatingChange = useCallback(async (rating) => {
    if (!isAuthenticated || !userGame || !game?.id) return;
    setSaving(true);
    try {
      const result = await updateGame(game.id, userGame.status, rating);
      if (result.success) {
        toast.success(`Rating saved: ${rating}`);
        setUserGame((prev) => ({ ...prev, rating }));
      } else {
        toast.error('Error saving rating');
      }
    } finally {
      setSaving(false);
      fetchStats();
    }
  }, [isAuthenticated, userGame, game?.id, updateGame, fetchStats]);

  const handleReviewUpdated = useCallback(() => {
    fetchStats();
    fetchUserGame();
  }, [fetchStats, fetchUserGame]);

  const handleAddToCollectionClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Log in to add games to your collection');
      return;
    }

    setIsCollectionModalOpen(true);
  }, [isAuthenticated]);

  const handleWriteReviewClick = useCallback(() => {
    if (!isAuthenticated) {
      toast.error('Sign in to share your review!');
      return;
    }
    if (isUnreleased) {
      toast.error("Seriously, have you played this game yet?");
      return;
    }
    setIsReviewModalOpen(true);
  }, [isAuthenticated, isUnreleased]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    try {
      // Always use clipboard for 100% reliability and clean experience
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!', {
        icon: '🔗',
        style: {
          borderRadius: '12px',
          background: '#1a1d2d',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.error('Error copying to clipboard:', err);
      }
    }
  }, []);

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

  if (error || notFound || !game || !game.name) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {banner && (
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{
              backgroundImage: `
        linear-gradient(
  to bottom,
  rgba(15, 17, 26, 0.6) 0%,
  rgba(15, 17, 26, 0.75) 50%,
  rgba(15, 17, 26, 0.9) 70%,
  rgba(15, 17, 26, 1) 85%
),
        url(${banner})
      `,
            }}
          />
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
            {/* Cover with Share Button */}
            <div className="shrink-0 space-y-3">
              <div className="relative group">
                <img
                  src={cover}
                  alt={game.name}
                  className="w-44 h-64 object-cover rounded-xl shadow-2xl ring-2 ring-white/10 group-hover:ring-primary-yellow/50 transition-all duration-300"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover'; }}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>

              <button
                onClick={handleShare}
                className="w-44 py-2.5 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 group shadow-lg"
              >
                <Share2 size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">Share Game</span>
              </button>
            </div>

            {/* Title & meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-3 mb-3">
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  {game.name}
                </h1>
                {(categoryName && (categoryName !== 'Main Game' || parentGame)) && (
                  parentGame ? (
                    <Link
                      to={`/game/${parentGame.slug || parentGame.id}`}
                      className="px-2 py-0.5 bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm rounded border border-gray-700 self-center mt-1 focus:outline-none"
                      title={categoryName === 'Main Game'
                        ? `This is a version of ${parentGame.name}`
                        : `A ${categoryName.toLowerCase()} of ${parentGame.name} (${parentGame.first_release_date ? new Date(parentGame.first_release_date * 1000).getFullYear() : 'Unknown'})`
                      }
                    >
                      {categoryName === 'Main Game' ? 'Edition' : categoryName}
                    </Link>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-800/80 text-gray-300 text-sm rounded border border-gray-700 self-center mt-1">
                      {categoryName}
                    </span>
                  )
                )}
              </div>

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
                    className="px-3 py-1 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold rounded-full border border-gray-700 transition-colors cursor-pointer"
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

            {/* Tab Navigation */}
            <div className="border-b border-gray-700">
              <nav className="-mb-px flex space-x-6">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${isActive
                          ? 'border-primary-yellow text-primary-yellow'
                          : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                        }
                      `}
                    >
                      <Icon className="mr-2" size={18} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'stats' && (
                <div className="animate-in fade-in duration-300">
                  <GameStatsPanel
                    stats={gameStats}
                    game={game}
                    igdbScore={igdbScore}
                    myReview={myReview}
                    onAddCollection={handleAddToCollectionClick}
                    onStatsUpdate={fetchStats}
                    onWriteReview={handleWriteReviewClick}
                  />
                </div>
              )}



              {activeTab === 'gallery' && (
                <div className="animate-in fade-in duration-300">
                  {screenshots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {screenshots.map((s, index) => (
                        <div key={s.id} className="aspect-video overflow-hidden rounded-xl bg-primary-navy-dark border border-white/5">
                          <img
                            src={formatIGDBImage(s.url, 't_screenshot_med')}
                            alt="Screenshot"
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                            onClick={() => setLightboxState({ isOpen: true, index })}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-primary-navy-dark rounded-2xl p-12 text-center border border-dashed border-gray-700">
                      <ImageIcon size={48} className="mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">No screenshots available for this game.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'details' && (
                <div className="animate-in fade-in duration-300 space-y-6">
                  {/* ── Game Info Card ── */}
                  <div className="bg-primary-navy-dark rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary-yellow/10 rounded-lg">
                        <Info size={20} className="text-primary-yellow" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Game Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column */}
                      <div className="space-y-6">
                        {game.game_modes?.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Game Modes</span>
                            <div className="flex flex-wrap gap-2">
                              {game.game_modes.map((m) => (
                                <span key={m.id} className="px-3 py-1 bg-primary-navy-light text-gray-200 text-sm rounded-lg">
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {game.player_perspectives?.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Player Perspectives</span>
                            <div className="flex flex-wrap gap-2">
                              {game.player_perspectives.map((p) => (
                                <span key={p.id} className="px-3 py-1 bg-primary-navy-light text-gray-200 text-sm rounded-lg">
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {game.age_ratings?.length > 0 && (() => {
                          const ORG_ORDER = ['ESRB', 'PEGI', 'CERO', 'USK', 'GRAC', 'CLASS_IND', 'ACB'];
                          const sortedRatings = [...game.age_ratings].sort((a, b) => {
                            const orgA = getAgeRatingImage(a).org;
                            const orgB = getAgeRatingImage(b).org;
                            const indexA = ORG_ORDER.indexOf(orgA);
                            const indexB = ORG_ORDER.indexOf(orgB);
                            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                          });

                          return (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Age Ratings</span>
                              <div className="flex flex-wrap gap-3">
                                {sortedRatings.map((ar) => {
                                  const { src, alt, org, label } = getAgeRatingImage(ar);
                                  return (
                                    <div key={ar.id} className="flex flex-col items-center justify-between bg-primary-navy rounded-xl p-2 min-w-[64px] transition-transform hover:scale-105 hover:bg-primary-navy-light shadow-sm">
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 text-center">{org}</span>
                                      {src ? (
                                        <img
                                          src={src}
                                          alt={alt}
                                          title={alt}
                                          className="h-11 w-auto object-contain drop-shadow-md pb-0.5"
                                        />
                                      ) : (
                                        <span className="text-sm font-bold text-gray-200 pb-1" title={alt}>
                                          {label}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        {game.websites?.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">External Links</span>
                            <div className="flex flex-wrap gap-4">
                              {game.websites.map((w) => {
                                const { Icon, label, color } = getWebsiteInfo(w);
                                return (
                                  <a
                                    key={w.id}
                                    href={w.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={label}
                                    className={`flex items-center justify-center p-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy-light hover:scale-110 transition-all shadow-sm ${color}`}
                                  >
                                    <Icon size={20} />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {!game.game_modes?.length && !game.player_perspectives?.length && !game.age_ratings?.length && !game.websites?.length && (
                          <p className="text-sm italic text-gray-500">More detailed information coming soon...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Language Support Card ── */}
                  {game.language_supports?.length > 0 && (() => {
                    // Build language → support types map
                    const langMap = {};
                    game.language_supports.forEach((ls) => {
                      const lang = ls.language?.name;
                      const type = ls.language_support_type?.name;
                      if (!lang || !type) return;
                      if (!langMap[lang]) langMap[lang] = {};
                      langMap[lang][type] = true;
                    });
                    const languages = Object.keys(langMap).sort();
                    // Detect which support types exist across all entries
                    const allTypes = [...new Set(game.language_supports.map(ls => ls.language_support_type?.name).filter(Boolean))].sort();
                    if (languages.length === 0) return null;
                    return (
                      <div className="bg-primary-navy-dark rounded-2xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-primary-yellow/10 rounded-lg">
                            <Globe size={20} className="text-primary-yellow" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Language Support</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700">
                                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-widest py-3 pr-4">Language</th>
                                {allTypes.map((t) => (
                                  <th key={t} className="text-center text-xs text-gray-500 font-semibold uppercase tracking-widest py-3 px-4">{t}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {languages.map((lang) => (
                                <tr key={lang} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
                                  <td className="py-2.5 pr-4 text-gray-300 font-medium">{lang}</td>
                                  {allTypes.map((t) => (
                                    <td key={t} className="text-center py-2.5 px-4">
                                      {langMap[lang][t]
                                        ? <Check size={16} className="inline text-green-400" />
                                        : <span className="text-gray-700">—</span>
                                      }
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'similar' && (
                <div className="animate-in fade-in duration-300">
                  {similarGames.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {similarGames.map((sg) => (
                        <div
                          key={sg.id}
                          onClick={() => navigate(`/game/${sg.slug || sg.id}`)}
                          className="cursor-pointer group"
                        >
                          <div className="aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10 group-hover:ring-primary-yellow transition-all duration-300">
                            <img
                              src={getGameCover(sg)}
                              alt={sg.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover'; }}
                            />
                          </div>
                          <p className="mt-2 text-xs font-medium text-gray-400 group-hover:text-white truncate transition-colors">
                            {sg.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-primary-navy-dark rounded-2xl p-12 text-center border border-dashed border-gray-700">
                      <Layers size={48} className="mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">No similar games found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
          <div className="space-y-5 lg:mt-[86px]">

            {/* My Library — Status + Rating (sidebar edition, compact) */}
            <div className="bg-primary-navy-dark rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">My Status</p>

                {isAuthenticated ? (
                  <div className={saving ? 'opacity-60 pointer-events-none' : ''}>
                    {isUnreleased ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-400 text-center">
                          Not released yet — add it to your wishlist.
                        </p>
                        <button
                          onClick={() => handleStatusSelect(userGame?.status === 'wishlist' ? null : 'wishlist')}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-white transition-all ${userGame?.status === 'wishlist'
                            ? 'bg-cyan-600 ring-2 ring-cyan-400'
                            : 'bg-gray-700 hover:bg-cyan-600 border border-gray-600'
                            }`}
                        >
                          <ShoppingCart size={13} />
                          {userGame?.status === 'wishlist' ? 'In Wishlist' : 'Add to Wishlist'}
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
                        {/* Status grid — 3 cols to fit sidebar width */}
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                          {STATUSES.map(({ id: sid, label, Icon, color, activeRing }) => {
                            const isActive = userGame?.status === sid;
                            return (
                              <button
                                key={sid}
                                onClick={() => handleStatusSelect(isActive ? null : sid)}
                                className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[11px] font-semibold text-white transition-all ${color} ${isActive ? `ring-2 ${activeRing} scale-[1.03]` : 'opacity-60 hover:opacity-100'}`}
                              >
                                <Icon size={14} />
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Remove */}
                        {userGame && (
                          <button
                            onClick={() => handleStatusSelect(null)}
                            className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-center mb-3"
                          >
                            Remove from my list
                          </button>
                        )}

                        {/* Rating */}
                        {userGame ? (
                          <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">My Rating</p>
                            <div className="flex items-center gap-3">
                              <StarRating
                                rating={userGame.rating || 0}
                                onRate={handleRatingChange}
                                interactive={true}
                                size={28}
                                gap={4}
                              />
                              {userGame.rating > 0 && (
                                <span className="text-[10px] font-black text-white bg-white/5 px-2 py-0.5 rounded">
                                  {Number(userGame.rating).toFixed(1)}/5
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 text-center">Add to list to rate</p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-gray-400 text-sm mb-3">Sign in to track this game</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full bg-primary-yellow text-primary-navy-dark py-2 rounded-lg font-bold text-sm hover:opacity-90 transition"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── HOW LONG TO BEAT (IGDB) ── */}
            {(() => {
              const ttb = game?.time_to_beat;
              if (!ttb || (!ttb.normally && !ttb.hastily && !ttb.completely)) return null;
              const fmt = (secs) => {
                if (!secs) return null;
                const h = secs / 3600;
                return h % 1 === 0 ? `${h}` : `${h.toFixed(1)}`;
              };
              const rows = [
                { label: 'Speedrun', val: fmt(ttb.hastily), Icon: Gem, color: 'text-violet-400', bg: 'bg-violet-400/10' },
                { label: 'Main Story', val: fmt(ttb.normally), Icon: Swords, color: 'text-sky-400', bg: 'bg-sky-400/10' },
                { label: 'Completionist', val: fmt(ttb.completely), Icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10' },
              ].filter(r => r.val);
              if (!rows.length) return null;
              return (
                <div className="bg-primary-navy-dark rounded-2xl overflow-hidden">
                  <div className="px-4 pt-4 pb-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">How Long to Beat</p>
                      <p className="text-[10px] text-gray-600">Source: IGDB</p>
                    </div>
                    <div className={`grid gap-3 ${rows.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {rows.map(({ label, val, Icon, color, bg }) => (
                        <div key={label} className="flex flex-col items-center gap-2">
                          <div className={`p-2.5 rounded-full bg-primary-navy ${bg}`}>
                            <Icon size={20} className={color} />
                          </div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xl font-black text-white leading-none">{val}</span>
                            <span className="text-xs font-bold text-gray-400">h</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-semibold text-center leading-tight">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── REVIEWS SECTION (Moved to bottom) ─────────────────────────────── */}
        <div className="mt-12 pt-10 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-primary-yellow/10 rounded-xl">
              <MessageSquare size={24} className="text-primary-yellow" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Community Reviews</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Player feedback & ratings</p>
            </div>
          </div>

          <ReviewsPanel
            game={game}
            onReviewUpdated={handleReviewUpdated}
            myReview={myReview}
            onRequestEditReview={handleWriteReviewClick}
          />
        </div>
      </div>

      {isCollectionModalOpen && (
        <AddToCollectionModal
          isOpen={isCollectionModalOpen}
          onClose={() => setIsCollectionModalOpen(false)}
          game={game}
        />
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          game={game}
          existingReview={myReview || (userGame ? { status: userGame.status, rating: userGame.rating } : null)}
          onSaveSuccess={handleReviewUpdated}
        />
      )}

      <ScreenshotLightbox
        screenshots={screenshots}
        initialIndex={lightboxState.index}
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState(prev => ({ ...prev, isOpen: false }))}
      />

      <Footer />
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

// ─── Community Stats Panel (right sidebar) ──────────────────────────────────
const GameStatsPanel = ({ stats, game, igdbScore, myReview, onAddCollection, onStatsUpdate, onWriteReview }) => {
  const { isAuthenticated } = useAuth();
  const { liked, toggleLike, toggling } = useGameLikes(game?.id);
  const navigate = useNavigate();

  const handleLikeClick = useCallback(async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Log in to like games');
      return;
    }
    await toggleLike(game.name, game.cover?.image_id);
    if (onStatsUpdate) onStatsUpdate();
  }, [isAuthenticated, toggleLike, game, onStatsUpdate]);

  if (stats === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-pulse">
        <div className="bg-primary-navy-dark rounded-2xl h-64" />
        <div className="bg-primary-navy-dark rounded-2xl h-64" />
        <div className="bg-primary-navy-dark rounded-2xl h-64" />
      </div>
    );
  }

  // Rating histogram buckets (10 buckets from 0.5 to 5.0)
  const ratingBuckets = stats?.ratingDistribution || Array.from({ length: 10 }).fill(0);
  const maxBucket = ratingBuckets.length > 0 ? Math.max(...ratingBuckets, 1) : 1;

  return (
    <div className="space-y-6">
      {/* ── ROW 1: MINI STAT CARDS (Engagement) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
        {/* Likes Panel */}
        <div
          onClick={() => navigate(`/game/${game.slug}/likes`)}
          className="bg-primary-navy-dark rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary-yellow/50 transition-all group"
        >
          <span className="text-4xl font-black text-white">{formatNumber(stats.likes || 0)}</span>
          <span className="text-gray-400 text-xs font-black uppercase tracking-widest mt-1.5 group-hover:text-primary-yellow transition-colors">Likes</span>

          <button
            onClick={(e) => { e.stopPropagation(); handleLikeClick(e); }}
            disabled={toggling}
            className={`mt-4 w-[85%] flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${liked
              ? 'bg-pink-500/10 border-pink-500/50 text-pink-500'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Heart size={14} className={liked ? 'fill-current' : ''} />
            {liked ? 'Liked' : 'Like'}
          </button>
        </div>

        {/* Collections Panel */}
        <div
          onClick={() => navigate(`/game/${game.slug}/collections`)}
          className="bg-primary-navy-dark rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary-yellow/50 transition-all group relative"
        >
          <span className="text-4xl font-black text-white">{formatNumber(stats.collectionsCount || 0)}</span>
          <span className="text-gray-400 text-xs font-black uppercase tracking-widest mt-1.5 group-hover:text-primary-yellow transition-colors">In Collections</span>

          <button
            onClick={(e) => { e.stopPropagation(); onAddCollection(e); }}
            className={`w-[85%] flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 ${(stats.collectionsPrivate > 0 || stats.collectionsPublic > 0) ? 'mt-2' : 'mt-4'}`}
          >
            <FolderPlus size={14} />
            Add to Collection
          </button>
        </div>

        {/* Reviews Panel */}
        <div
          onClick={() => navigate(`/game/${game.slug}/reviews`)}
          className="bg-primary-navy-dark rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary-yellow/50 transition-all group"
        >
          <span className="text-4xl font-black text-white">{formatNumber(stats.reviewsCount || 0)}</span>
          <span className="text-gray-400 text-xs font-black uppercase tracking-widest mt-1.5 group-hover:text-primary-yellow transition-colors">Reviews</span>

          <button
            onClick={(e) => { e.stopPropagation(); onWriteReview(); }}
            className="mt-4 w-[85%] flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
          >
            {myReview ? (
              <>
                <Pencil size={14} />
                Edit Review
              </>
            ) : (
              <>
                <Plus size={14} />
                Write Review
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── COMMUNITY RATING (MIMICS RATING DISTRIBUTION) ── */}
        <div className="bg-primary-navy-dark rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Community Rating</h4>
            {igdbScore && (
              <div className="text-xs font-bold">
                <span className="text-primary-yellow">{igdbScore}</span>
                <a
                  href={game.url || `https://www.igdb.com/games/${game.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 ml-1 hover:text-white hover:underline transition-colors cursor-pointer relative z-10"
                >
                  on IGDB
                </a>
              </div>
            )}
          </div>

          {stats.ratingsCount > 0 ? (
            <div className="flex gap-6 items-center">
              {/* Score summary */}
              <div className="flex flex-col items-center shrink-0">
                <span className="text-5xl font-black text-white leading-none">{stats.avgRating?.toFixed(1) || '0.0'}</span>
                <span className="text-amber-400 text-xl tracking-widest my-2">{renderStars(stats.avgRating || 0)}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stats.ratingsCount.toLocaleString()} votes</span>
              </div>

              {/* Vertical bars */}
              <div className="flex-1 grid grid-cols-10 gap-1 h-32 pt-2 items-end">
                {[...ratingBuckets].map((val, i) => {
                  const ratingValue = (i + 1) * 0.5;
                  const percentage = stats.ratingsCount > 0 ? ((val / stats.ratingsCount) * 100).toFixed(1) : 0;
                  const isMin = i === 0;
                  const isMax = i === ratingBuckets.length - 1;

                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 group h-full cursor-pointer relative"
                    >
                      <div className="flex-1 w-full bg-white/5 rounded-t-sm flex items-end relative">
                        <div
                          className="w-full bg-amber-400 rounded-t-sm transition-all duration-500 group-hover:bg-amber-300 group-hover:scale-x-110"
                          style={{ height: `${(val / maxBucket) * 100}%` }}
                        />
                        {/* Custom Tooltip */}
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 translate-y-1 group-hover:translate-y-0 flex flex-col items-center">
                          <div className="bg-primary-navy-dark border border-white/10 shadow-2xl px-2.5 py-1 rounded-md whitespace-nowrap relative z-10">
                            <span className="text-[11px] font-semibold text-white tracking-wide">
                              {ratingValue.toFixed(1)} <span className="text-gray-500 mx-1">|</span> {val} {val === 1 ? 'vote' : 'votes'} <span className="text-amber-400 ml-0.5">({percentage}%)</span>
                            </span>
                          </div>
                          <div className="w-2.5 h-2.5 bg-white rotate-45 -mt-0.5 shadow-lg relative z-0" />
                        </div>
                      </div>
                      <div className="h-4 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-500 transition-colors group-hover:text-gray-300">
                          {isMin ? '0.5' : isMax ? '5' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-44 border-2 border-dashed border-white/5 rounded-xl">
              <p className="text-gray-600 text-xs font-black italic uppercase tracking-widest">No ratings yet</p>
            </div>
          )}
        </div>

        {/* ── PLAY STATUS (MIMICS LIBRARY PROGRESS) ── */}
        <div className="bg-primary-navy-dark rounded-2xl p-6 flex flex-col justify-between">
          <h4 className="text-base font-bold text-white mb-5 uppercase tracking-wider text-xs font-black">Play Status</h4>

          {/* Completed + Backlog highlights */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              onClick={() => navigate(`/game/${game.slug}/completed`)}
              className="bg-primary-navy border-l-4 border-green-500 rounded-xl p-4 flex flex-col hover:-translate-y-1 hover:bg-white/5 transition-all duration-200 group cursor-pointer"
            >
              <span className="text-3xl font-black text-green-400 leading-none">{stats.completed || 0}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 group-hover:text-green-400 transition-colors">Completed</span>
            </div>
            <div
              onClick={() => navigate(`/game/${game.slug}/backlog`)}
              className="bg-primary-navy border-l-4 border-indigo-500 rounded-xl p-4 flex flex-col hover:-translate-y-1 hover:bg-white/5 transition-all duration-200 group cursor-pointer"
            >
              <span className="text-3xl font-black text-indigo-400 leading-none">{stats.backlog || 0}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 group-hover:text-indigo-400 transition-colors">Backlog</span>
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="flex justify-between items-center bg-primary-navy rounded-xl px-4 py-3">
            <div
              onClick={() => navigate(`/game/${game.slug}/playing`)}
              className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 group cursor-pointer hover:text-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 group-hover:scale-125 transition-transform" />
              Playing: <span className="text-white font-black">{stats.playing || 0}</span>
            </div>
            <div
              onClick={() => navigate(`/game/${game.slug}/wishlist`)}
              className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 group cursor-pointer hover:text-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-pink-400 shrink-0 group-hover:scale-125 transition-transform" />
              Wishlist: <span className="text-white font-black">{stats.wishlist || 0}</span>
            </div>
            <div
              onClick={() => navigate(`/game/${game.slug}/dropped`)}
              className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 group cursor-pointer hover:text-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 group-hover:scale-125 transition-transform" />
              Dropped: <span className="text-white font-black">{stats.dropped || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
