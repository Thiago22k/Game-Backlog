import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Clock, Gamepad2, Search, Trophy, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import Navbar from '../components/layout/Navbar';
import InteractiveGameCard from '../components/games/InteractiveGameCard';
import AnticipatedGameCard from '../components/games/AnticipatedGameCard';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { games, loading, getUserGames, updateGame, deleteGame, addGame } = useGames();

  // Estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Cargar juegos al montar el componente
  useEffect(() => {
    getUserGames();
  }, []);

  // Separar juegos en wishlist (próximos) y el resto
  const separateGames = () => {
    const now = new Date();
    const wishlistComingSoon = [];
    const myGames = [];

    games.forEach(game => {
      const releaseDate = game.game_details?.first_release_date
        ? new Date(game.game_details.first_release_date * 1000)
        : null;

      // Si es wishlist Y (no tiene fecha O la fecha es futura)
      if (game.status === 'wishlist' && (!releaseDate || releaseDate > now)) {
        wishlistComingSoon.push(game);
      } else {
        myGames.push(game);
      }
    });

    return { wishlistComingSoon, myGames };
  };

  const { wishlistComingSoon, myGames } = separateGames();

  // Aplicar búsqueda
  const applySearch = (gamesList) => {
    if (!searchQuery.trim()) return gamesList;

    return gamesList.filter(game =>
      game.game_details?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Aplicar filtros (solo para My Games)
  const applyFilters = (gamesList) => {
    let filtered = [...gamesList];

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(game => game.status === statusFilter);
    }

    // Filtro por calificación
    if (ratingFilter !== 'all') {
      const targetRating = parseInt(ratingFilter);
      filtered = filtered.filter(game => game.rating === targetRating);
    }

    return filtered;
  };

  // Aplicar ordenamiento
  const applySort = (gamesList) => {
    const sorted = [...gamesList];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) =>
          (a.game_details?.name || '').localeCompare(b.game_details?.name || '')
        );
      case 'rating-high':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'rating-low':
        return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      case 'recent':
      default:
        return sorted.sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        );
    }
  };

  // Procesar juegos
  const filteredWishlist = applySearch(wishlistComingSoon);
  const processedMyGames = applySort(applyFilters(applySearch(myGames)));

  // Calcular estadísticas
  const stats = {
    total: games.length,
    completed: games.filter(g => g.status === 'completed').length,
    avgRating: games.filter(g => g.rating).length > 0
      ? (games.reduce((sum, g) => sum + (g.rating || 0), 0) / games.filter(g => g.rating).length).toFixed(1)
      : 0,
  };

  // Handlers para InteractiveGameCard
  const handleStatusChange = async (gameId, newStatus) => {
    const game = games.find(g => g.igdb_game_id === gameId);

    if (newStatus === null && game) {
      const result = await deleteGame(gameId);

      if (result.success) {
        toast.success('Game removed from your list');
      } else {
        toast.error('Error removing game');
      }
    } else if (game) {
      const result = await updateGame(gameId, newStatus, game.rating);

      if (result.success) {
        toast.success('Status updated');
      } else {
        toast.error('Error updating status');
      }
    }
  };

  const handleRatingChange = async (gameId, rating) => {
    const game = games.find(g => g.igdb_game_id === gameId);

    if (game) {
      const result = await updateGame(gameId, game.status, rating);

      if (result.success) {
        toast.success(`Rating saved: ${rating} ⭐`);
      } else {
        toast.error('Error saving rating');
      }
    }
  };

  const handleWishlistToggle = async (gameId, newStatus) => {
    if (newStatus === null) {
      const result = await deleteGame(gameId);

      if (result.success) {
        toast.success('Removed from wishlist');
      } else {
        toast.error('Error removing from wishlist');
      }
    } else {
      const result = await addGame(gameId, 'wishlist');

      if (result.success) {
        toast.success('Added to wishlist');
      } else {
        toast.error('Error adding to wishlist');
      }
    }
  };

  // Mapear juegos para las cards
  const mapGameForCard = (game) => {
    return {
      id: game.igdb_game_id,
      name: game.game_details?.name || 'Unknown',
      cover: game.game_details?.cover,
      artworks: game.game_details?.artworks,
      screenshots: game.game_details?.screenshots,
      genres: game.game_details?.genres,
      first_release_date: game.game_details?.first_release_date,
      rating: game.game_details?.rating,
      status: game.status,
      user_rating: game.rating,
    };
  };

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header con Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Welcome back, {user?.username}
            </h2>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-400">
                {stats.total} game{stats.total !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1 text-green-400">
                <Trophy size={14} />
                {stats.completed} completed
              </span>
              {stats.avgRating > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="flex items-center gap-1 text-primary-yellow">
                    <Star size={14} fill="currentColor" />
                    {stats.avgRating} avg
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="px-6 py-2 bg-primary-yellow text-primary-navy-dark rounded-lg hover:opacity-90 font-semibold transition-all"
          >
            Settings
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search your games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-primary-navy-dark border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-yellow transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow"></div>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
            <p className="text-gray-400 mb-4">
              You don't have any games in your collection yet.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="bg-primary-yellow text-primary-navy-dark px-6 py-2 rounded-lg hover:opacity-90 font-semibold transition-all"
            >
              Explore Games
            </button>
          </div>
        ) : (
          <>
            {/* Wishlist - Coming Soon */}
            {filteredWishlist.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center mb-6">
                  <Clock className="text-primary-yellow mr-2" size={24} />
                  <h3 className="text-2xl font-bold text-white">
                    My Wishlist (Coming Soon)
                  </h3>
                  <span className="ml-3 text-gray-400">
                    {filteredWishlist.length} game{filteredWishlist.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {filteredWishlist.map((game) => (
                    <AnticipatedGameCard
                      key={game.id}
                      game={mapGameForCard(game)}
                      interactive={true}
                      onWishlistToggle={handleWishlistToggle}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* My Games con filtros */}
            {myGames.length > 0 && (
              <section>
                <div className="flex items-center mb-6">
                  <Gamepad2 className="text-primary-yellow mr-2" size={24} />
                  <h3 className="text-2xl font-bold text-white">
                    My Games
                  </h3>
                  <span className="ml-3 text-gray-400">
                    {processedMyGames.length} / {myGames.length} game{myGames.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Filtros */}
                <div className="mb-6 space-y-4">
                  {/* Filtro por estado */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-gray-400 text-sm self-center mr-2">Status:</span>
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'playing', label: 'Playing' },
                      { value: 'wishlist', label: 'Wishlist' },
                      { value: 'dropped', label: 'Dropped' },
                    ].map(status => (
                      <button
                        key={status.value}
                        onClick={() => setStatusFilter(status.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === status.value
                            ? 'bg-primary-yellow text-primary-navy-dark'
                            : 'bg-primary-navy-dark text-gray-400 hover:text-white border border-gray-700'
                          }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>

                  {/* Filtro por rating y ordenamiento */}
                  <div className="flex flex-wrap gap-4">
                    {/* Rating filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Rating:</span>
                      <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className="bg-primary-navy-dark border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-yellow"
                      >
                        <option value="all">All</option>
                        <option value="5">⭐⭐⭐⭐⭐(5)</option>
                        <option value="4">⭐⭐⭐⭐ (4)</option>
                        <option value="3">⭐⭐⭐ (3)</option>
                        <option value="2">⭐⭐ (2)</option>
                        <option value="1">⭐ (1)</option>
                      </select>
                    </div>

                    {/* Sort by */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-primary-navy-dark border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-yellow"
                      >
                        <option value="recent">Recently Added</option>
                        <option value="name">Name (A-Z)</option>
                        <option value="rating-high">Rating (High-Low)</option>
                        <option value="rating-low">Rating (Low-High)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Grid de juegos */}
                {processedMyGames.length === 0 ? (
                  <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
                    <p className="text-gray-400">
                      No games match your filters.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    {processedMyGames.map((game) => (
                      <InteractiveGameCard
                        key={game.id}
                        game={mapGameForCard(game)}
                        interactive={true}
                        onStatusChange={handleStatusChange}
                        onRatingChange={handleRatingChange}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Mensaje si la búsqueda no encuentra nada */}
            {searchQuery && filteredWishlist.length === 0 && processedMyGames.length === 0 && (
              <div className="text-center py-12 bg-primary-navy-dark rounded-lg">
                <p className="text-gray-400">
                  No games found for "{searchQuery}"
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;