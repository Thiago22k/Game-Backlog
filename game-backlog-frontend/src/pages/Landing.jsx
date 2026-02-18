import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import GameGrid from '../components/games/GameGrid';
import InteractiveGameCard from '../components/games/InteractiveGameCard';
import { useGames } from '../hooks/useGames';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const { addGame, updateGame, userGames } = useGames();
  const [popularGames, setPopularGames] = useState([]);
  const [bestOfYearGames, setBestOfYearGames] = useState([]);
  const [anticipatedGames, setAnticipatedGames] = useState([]);
  const [loading, setLoading] = useState(true);

const handleStatusChange = async (gameId, newStatus, currentRating = 0) => {
  if (!isAuthenticated) return;

  const existingGame = userGames.find(g => g.igdb_game_id === gameId);

  if (existingGame) {
    const result = await updateGame(
      existingGame.id, 
      newStatus, 
      currentRating >= 1 && currentRating <= 5 ? currentRating : existingGame.rating
    );
    
    if (result.success) {
      console.log('Status updated successfully');
      // Refrescar la lista de juegos
      window.location.reload(); // Temporal: fuerza recarga
    } else {
      console.error('Error updating status:', result.error);
      alert('Error updating status');
    }
  } else if (newStatus !== null) {
    const result = await addGame(
      gameId, 
      newStatus, 
      currentRating >= 1 && currentRating <= 5 ? currentRating : null
    );
    
    if (result.success) {
      console.log('Game added successfully');
      // Refrescar la lista de juegos
      window.location.reload(); // Temporal: fuerza recarga
    } else {
      console.error('Error adding game:', result.error);
      alert('Error adding game');
    }
  }
};

const handleRatingChange = async (gameId, rating) => {
  if (!isAuthenticated) return;

  const existingGame = userGames.find(g => g.igdb_game_id === gameId);

  if (existingGame) {
    const result = await updateGame(existingGame.id, existingGame.status, rating);
    
    if (result.success) {
      console.log('Rating updated successfully');
      // No hacer reload aquí, solo actualizar visualmente
      // El reload lo hace handleStatusChange si fue necesario
    } else {
      console.error('Error updating rating:', result.error);
      alert('Error updating rating');
    }
  }
};

  // Imágenes de fondo aleatorias
  const backgroundImages = [
    'https://images.igdb.com/igdb/image/upload/t_1080p/co5vmg.jpg',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co6kz7.jpg',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co5w4u.jpg',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co1r7f.jpg',
  ];

  const [randomBg] = useState(() => 
    backgroundImages[Math.floor(Math.random() * backgroundImages.length)]
  );

  useEffect(() => {
  const fetchGames = async () => {
    try {
      const [popularRes, bestOfYearRes, anticipatedRes] = await Promise.all([
        axios.get(`${ENDPOINTS.GAMES.EXPLORE}?sort=relevance&timeRange=last_month&limit=10`),
        axios.get(`${ENDPOINTS.GAMES.EXPLORE}?sort=popular&timeRange=last_year&limit=10`), // ← Cambio aquí
        axios.get(`${ENDPOINTS.GAMES.ANTICIPATED}?limit=10`)
      ]);

      setPopularGames(popularRes.data.games);
      setBestOfYearGames(bestOfYearRes.data.games); // ← Cambio aquí
      setAnticipatedGames(anticipatedRes.data.games);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchGames();
}, []);

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
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
              to="/profile"
              className="inline-block bg-gradient-get-started hover:opacity-90 text-primary-navy px-8 py-4 rounded-lg text-lg font-bold transition"
            >
              Go to My Profile
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Games Sections */}
        {loading ? (
  <div className="py-12 text-center">
    <p className="text-gray-400">Loading games...</p>
  </div>
) : (
  <>
    {/* Sección INTERACTIVA de prueba - Popular Now */}
    <div className="py-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          <Flame className="text-primary-yellow inline-block mr-2" size={24} />
          Popular Now
        </h2>
        <button
          onClick={() => window.location.href = '/explore?timeRange=last_month'}
          className="text-primary-yellow hover:text-opacity-80 font-medium transition-all"
        >
          View All →
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
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

    {/* Las otras secciones SIN cambios */}
    <GameGrid 
      games={anticipatedGames} 
      title={
        <>
          <Clock className="text-primary-yellow inline-block mr-2" size={24} />
          Most Anticipated
        </>
      }
      viewAllLink="/explore"
      showReleaseDate={true}
    />

    <GameGrid 
      games={bestOfYearGames} 
      title={
        <>
          <Trophy className="text-primary-yellow inline-block mr-2" size={24} />
          Best of Last Year
        </>
      }
      viewAllLink="/explore?sort=popular&timeRange=last_year"
    />
  </>
)}

        {/* Features Section */}
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center text-primary-yellow mb-12">
            Why Stackd?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-primary-navy-dark p-8 rounded-2xl shadow-lg text-center border border-gray-700 hover:border-primary-yellow transition-all">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Organize Your Backlog
              </h3>
              <p className="text-gray-400">
                Keep track of all the games you want to play and the ones you've completed
              </p>
            </div>
            <div className="bg-primary-navy-dark p-8 rounded-2xl shadow-lg text-center border border-gray-700 hover:border-primary-yellow transition-all">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Rate Your Games
              </h3>
              <p className="text-gray-400">
                Assign ratings from 1 to 5 stars to each game you complete
              </p>
            </div>
            <div className="bg-primary-navy-dark p-8 rounded-2xl shadow-lg text-center border border-gray-700 hover:border-primary-yellow transition-all">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Discover New Titles
              </h3>
              <p className="text-gray-400">
                Explore thousands of games thanks to integration with IGDB
              </p>
            </div>
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
      <footer className="bg-primary-navy-dark border-t border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500">
            © 2026 Stackd. Game data powered by IGDB.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;