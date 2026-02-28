import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Clock, Trophy, ClipboardList, Star, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import InteractiveGameCard from '../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../components/games/AnticipatedGameCard';
import InteractiveGameCardSkeleton from '../components/games/InteractiveGameCardSkeleton';
import AnticipatedGameCardSkeleton from '../components/games/AnticipatedGameCardSkeleton';
import CompactGameCard from '../components/games/CompactGameCard';
import ReviewPreviewCard from '../components/reviews/ReviewPreviewCard';
import { useGames } from '../hooks/useGames';
import usePageTitle from '../hooks/usePageTitle';
import toast from 'react-hot-toast';
import { formatIGDBImage } from '../utils/formatters';

// Constante a nivel de módulo — no se recrea en cada render
const STATUS_LABELS = {
  completed: 'Completed',
  playing: 'Playing',
  wishlist: 'Wishlist',
  backlog: 'Backlog',
  dropped: 'Dropped',
};

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addGame, updateGame, deleteGame, userGames, getUserGames } = useGames();

  const [popularGames, setPopularGames] = useState([]);
  const [bestOfYearGames, setBestOfYearGames] = useState([]);
  const [anticipatedGames, setAnticipatedGames] = useState([]);
  const [recommendedGames, setRecommendedGames] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Seleccionar el juego destacado (el más cercano a lanzarse de los esperados)
  const featuredGame = useMemo(() => {
    if (!anticipatedGames.length) return null;
    return [...anticipatedGames]
      .filter(g => g.screenshots?.length || g.artworks?.length)
      .sort((a, b) => (a.first_release_date || 0) - (b.first_release_date || 0))[0] || anticipatedGames[0];
  }, [anticipatedGames]);

  usePageTitle(''); // Uses default 'Stackd'

  // Ref para tener siempre los userGames frescos dentro de los handlers
  const userGamesRef = useRef(userGames);
  useEffect(() => { userGamesRef.current = userGames; }, [userGames]);

  // Helper: actualiza el estado de un juego en las tres listas a la vez
  const updateAllLists = useCallback((gameId, patch) => {
    const applyPatch = (g) => (g.id === gameId ? { ...g, ...patch } : g);
    setPopularGames((prev) => prev.map(applyPatch));
    setBestOfYearGames((prev) => prev.map(applyPatch));
    setAnticipatedGames((prev) => prev.map(applyPatch));
  }, []);

  const handleWishlistToggle = useCallback(async (gameId, newStatus) => {
    if (!isAuthenticated) return;

    const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);

    if (newStatus === null && existingGame) {
      const result = await deleteGame(gameId);
      if (result.success) {
        toast.success('Removed from your wishlist');
        updateAllLists(gameId, { status: null });
      } else {
        toast.error('Error removing from your wishlist');
      }
    } else if (newStatus === 'wishlist') {
      const result = await addGame(gameId, 'wishlist');
      if (result.success) {
        toast.success('Added to your wishlist!');
        updateAllLists(gameId, { status: 'wishlist' });
      } else {
        toast.error('Error adding to your wishlist');
      }
    }
  }, [isAuthenticated, addGame, deleteGame, updateAllLists]);

  const handleStatusChange = useCallback(async (gameId, newStatus, currentRating = 0) => {
    if (!isAuthenticated) return;

    const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);
    const validRating = currentRating >= 1 && currentRating <= 5 ? currentRating : null;

    if (newStatus === null) {
      if (!existingGame) return;
      const result = await deleteGame(gameId);
      if (result.success) {
        toast.success('Game removed from your list');
        updateAllLists(gameId, { status: null, user_rating: 0 });
      } else {
        toast.error('Error deleting the game');
      }
      return;
    }

    if (existingGame) {
      const result = await updateGame(gameId, newStatus, validRating ?? existingGame.rating);
      if (result.success) {
        toast.success(`Status changed to "${STATUS_LABELS[newStatus] || newStatus}"`);
        updateAllLists(gameId, {
          status: newStatus,
          user_rating: validRating ?? undefined,
        });
      } else {
        toast.error('Error updating status');
      }
    } else {
      const result = await addGame(gameId, newStatus, validRating);
      if (result.success) {
        toast.success(
          `Added as "${STATUS_LABELS[newStatus]}"! Now you can rate it`,
          { duration: 4000 }
        );
        updateAllLists(gameId, { status: newStatus, user_rating: validRating ?? 0 });
      } else {
        toast.error('Error adding game');
      }
    }
  }, [isAuthenticated, addGame, updateGame, deleteGame, updateAllLists]);

  const handleRatingChange = useCallback(async (gameId, rating) => {
    if (!isAuthenticated) return;
    const existingGame = userGamesRef.current.find((g) => g.igdb_game_id === gameId);
    if (!existingGame) {
      toast.error('First add the game to your list');
      return;
    }

    const result = await updateGame(existingGame.igdb_game_id, existingGame.status, rating);
    if (result.success) {
      toast.success(`Saved rating: ${rating}`);
      updateAllLists(gameId, { user_rating: rating });
    } else {
      toast.error('Error saving rating');
    }
  }, [isAuthenticated, updateGame, updateAllLists]);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        // Cargar juegos del usuario (si autenticado) y los feeds en paralelo
        const [userResult, popularRes, bestOfYearRes, anticipatedRes, recommendedRes, recentReviewsRes] = await Promise.all([
          isAuthenticated ? getUserGames() : Promise.resolve({ success: false, data: [] }),
          axios.get(`${ENDPOINTS.GAMES.EXPLORE}?sort=relevance&timeRange=last_month&limit=8`),
          axios.get(`${ENDPOINTS.GAMES.EXPLORE}?sort=popular&timeRange=last_year&limit=8`),
          axios.get(`${ENDPOINTS.GAMES.ANTICIPATED}?limit=8`),
          isAuthenticated ? axios.get(`${ENDPOINTS.GAMES.RECOMMENDATIONS}?limit=6`) : axios.get(`${ENDPOINTS.GAMES.EXPLORE}?sort=popular&limit=6`),
          axios.get('/reviews/recent?limit=4')
        ]);

        const userGamesData = userResult.success ? userResult.data : [];

        // Actualiza también el ref para que los handlers lo tengan disponible de inmediato
        userGamesRef.current = userGamesData;

        const mergeUserData = (igdbGames) =>
          igdbGames.map((game) => {
            const userGame = userGamesData.find((ug) => ug.igdb_game_id === game.id);
            return {
              ...game,
              status: userGame?.status ?? null,
              user_rating: userGame?.rating ?? 0,
            };
          });

        setPopularGames(mergeUserData(popularRes.data.games));
        setBestOfYearGames(mergeUserData(bestOfYearRes.data.games));
        setAnticipatedGames(mergeUserData(anticipatedRes.data.games));
        setRecommendedGames(mergeUserData(recommendedRes.data.games || recommendedRes.data));
        setRecentReviews(recentReviewsRes.data || []);
      } catch (error) {
        console.error('Error loading games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-primary-navy relative">
      {/* Dynamic Background with Fade Effect */}
      <div className="absolute top-0 left-0 w-full h-[950px] z-0 overflow-hidden pointer-events-none">
        {featuredGame && (
          <>
            <img
              src={
                featuredGame.screenshots?.[0]?.url
                  ? formatIGDBImage(featuredGame.screenshots[0].url, 't_screenshot_huge')
                  : formatIGDBImage(featuredGame.cover?.url, 't_screenshot_huge')
              }
              alt=""
              className="w-full h-full object-cover opacity-30"
              style={{ filter: 'brightness(0.7)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary-navy/40 via-transparent to-primary-navy" />
          </>
        )}
      </div>
      {
        featuredGame && (
          <div className="absolute right-6 top-48 z-20 hidden lg:flex flex-col items-center">
            <Link
              to={`/game/${featuredGame.slug}`}
              className="vertical-text text-[10px] font-bold tracking-[0.3em] text-primary-yellow/60 hover:text-primary-yellow transition-all uppercase whitespace-nowrap"
              style={{ writingMode: 'vertical-rl' }}
            >
              Featured: {featuredGame.name}
            </Link>
          </div>
        )
      }

      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-64 pb-48 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
            Stack<span className="text-primary-yellow">d</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-gray-300">
            Organize your game collection, track your progress, and discover new titles
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="bg-gradient-get-started hover:opacity-90 text-primary-navy px-8 py-4 rounded-lg text-lg font-bold transition"
              >
                Get Started Free
              </Link>
              <Link
                to="/explore"
                className="bg-primary-navy-dark hover:bg-opacity-80 text-white px-8 py-4 rounded-lg text-lg font-semibold transition border-2 border-primary-yellow"
              >
                Explore Games
              </Link>
            </div>
          ) : (
            <Link
              to={`/profile/${user?.username}`}
              className="inline-block bg-gradient-get-started hover:opacity-90 text-primary-navy px-8 py-4 rounded-lg text-lg font-bold transition"
            >
              Go to My Profile
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {loading ? (
          <>
            {/* Popular Now Skeletons */}
            <div className="py-12">
              <div className="flex justify-between items-center mb-6">
                <div className="h-8 w-48 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 w-24 bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <InteractiveGameCardSkeleton key={`pop-skel-${i}`} />
                ))}
              </div>
            </div>

            {/* Most Anticipated Skeletons */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div className="h-8 w-56 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 w-24 bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <AnticipatedGameCardSkeleton key={`ant-skel-${i}`} />
                ))}
              </div>
            </section>

            {/* Best of Last Year Skeletons */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div className="h-8 w-56 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 w-24 bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <InteractiveGameCardSkeleton key={`best-skel-${i}`} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Popular Now */}
            <div className="py-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  <Flame className="text-primary-yellow inline-block mr-2" size={24} />
                  Popular Now
                </h2>
                <button
                  onClick={() => navigate('/explore?timeRange=last_month')}
                  className="text-sm text-gray-400 hover:text-primary-yellow transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {popularGames.map((game) => (
                  <InteractiveGameCard
                    key={game.id}
                    game={game}
                    interactive={isAuthenticated}
                    onStatusChange={handleStatusChange}
                    onRatingChange={handleRatingChange}
                  />
                ))}
              </div>
            </div>

            {/* Split Layout: Recommendations & Recent Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              {/* Recommendations Column */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center text-white">
                    <Star className="text-primary-yellow inline-block mr-2" size={24} />
                    {isAuthenticated ? 'Recommended for You' : 'Recommended Games'}
                  </h2>
                </div>
                {recommendedGames.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendedGames.map((game) => (
                      <CompactGameCard
                        key={`rec-${game.id}`}
                        game={game}
                        interactive={isAuthenticated}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-primary-navy-dark rounded-xl p-8 text-center h-[380px] flex flex-col justify-center">
                    <p className="text-gray-400 italic">No recommendations available yet.</p>
                    {isAuthenticated && <p className="text-sm text-gray-500 mt-2">Add more games to your list to get personalized suggestions.</p>}
                  </div>
                )}
              </div>

              {/* Recent Reviews Column */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center text-white">
                    <ClipboardList className="text-primary-yellow inline-block mr-2" size={24} />
                    Community Reviews
                  </h2>
                </div>
                {recentReviews.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recentReviews.map((review) => (
                      <ReviewPreviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-primary-navy-dark rounded-xl p-8 text-center h-[380px] flex flex-col justify-center">
                    <p className="text-gray-400 italic">No recent reviews found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Most Anticipated */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold flex items-center text-white">
                  <Clock className="text-primary-yellow inline-block mr-2" size={24} />
                  Most Anticipated
                </h2>
                <button
                  onClick={() => navigate('/explore?anticipated=true')}
                  className="text-sm text-gray-400 hover:text-primary-yellow transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {anticipatedGames.map((game) => (
                  <AnticipatedGameCard
                    key={game.id}
                    game={game}
                    interactive={isAuthenticated}
                    onWishlistToggle={handleWishlistToggle}
                  />
                ))}
              </div>
            </section>

            {/* Best of Last Year */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold flex items-center text-white">
                  <Trophy className="text-primary-yellow inline-block mr-2" size={24} />
                  Best of Last Year
                </h2>
                <Link
                  to="/explore?sort=popular&timeRange=last_year"
                  className="text-sm text-gray-400 hover:text-primary-yellow transition-colors"
                >
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {bestOfYearGames.map((game) => (
                  <InteractiveGameCard
                    key={game.id}
                    game={game}
                    interactive={isAuthenticated}
                    onStatusChange={handleStatusChange}
                    onRatingChange={handleRatingChange}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Features Section */}
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center text-primary-yellow mb-12">
            Why Stackd?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: ClipboardList, title: 'Organize Your Backlog', desc: "Keep track of all the games you want to play and the ones you've completed", color: 'text-blue-400' },
              { icon: Star, title: 'Rate Your Games', desc: 'Assign ratings from 1 to 5 stars to each game you complete', color: 'text-primary-yellow' },
              { icon: Gamepad2, title: 'Discover New Titles', desc: 'Explore thousands of games thanks to integration with IGDB', color: 'text-purple-400' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-primary-navy-dark p-8 rounded-2xl shadow-lg text-center border border-gray-700 hover:border-primary-yellow transition-all flex flex-col items-center"
              >
                <div className={`mb-6 p-4 rounded-full bg-gray-800 bg-opacity-50 ${color}`}>
                  <Icon size={40} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        {!isAuthenticated && (
          <div className="py-16 text-center">
            <div className="bg-primary-navy-dark rounded-2xl p-12 border-2 border-primary-yellow">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start Organizing Your Backlog Today
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-lg">
                Join gamers who are already organizing their game collections
              </p>
              <Link
                to="/register"
                className="inline-block bg-gradient-get-started hover:opacity-90 text-primary-navy px-10 py-4 rounded-lg text-lg font-bold transition"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-primary-navy-dark border-t border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500">© 2026 Stackd. Game data powered by IGDB.</p>
        </div>
      </footer>
    </div >
  );
};

export default Landing;