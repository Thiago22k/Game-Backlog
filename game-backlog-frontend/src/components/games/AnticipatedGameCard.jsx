import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Check, MoreHorizontal, FolderPlus, Heart } from 'lucide-react';
import { getGameCover, formatIGDBImage, PLACEHOLDER_COVER } from '../../utils/formatters';
import RatingBadge from '../common/RatingBadge';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AddToCollectionModal from '../collections/AddToCollectionModal';
import { useGameLikes } from '../../hooks/useGameLikes';
import { useCardMenu } from '../../hooks/useCardMenu';

const AnticipatedGameCard = ({ game, interactive = false, onWishlistToggle, showWishlistButton = true, showAddButton = true }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(game.status === 'wishlist');
  const cardId = `anticipated-${game.id}`;
  const { isOpen: showOptionsMenu, open: openOptionsMenu, close: closeOptionsMenu, toggle: toggleOptionsMenu } = useCardMenu(cardId);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const { liked, likesCount, toggling, toggleLike } = useGameLikes(game.id);

  // Sincronizar con props cuando cambien
  useEffect(() => {
    setIsInWishlist(game.status === 'wishlist');
  }, [game.status]);

  // Calcular countdown
  const getCountdown = () => {
    if (!game.first_release_date) {
      return { text: 'TBA', color: 'bg-gray-600' };
    }

    const releaseDate = new Date(game.first_release_date * 1000);
    const now = new Date();
    const daysUntil = Math.ceil((releaseDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { text: 'Out Now!', color: 'bg-green-600' };
    } else if (daysUntil === 0) {
      return { text: 'Releases Today!', color: 'bg-primary-yellow text-primary-navy-dark' };
    } else if (daysUntil <= 30) {
      return { text: `Releases in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`, color: 'bg-primary-yellow text-primary-navy-dark' };
    } else {
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      return { text: releaseDate.toLocaleDateString('en-US', options), color: 'bg-gray-600' };
    }
  };

  const countdown = getCountdown();

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!interactive) {
      sessionStorage.setItem('redirectAfterLogin', `/game/${game.slug || game.id}`);
      toast.error('Log in to add games to your wishlist');
      return;
    }

    // Toggle wishlist
    const newStatus = isInWishlist ? null : 'wishlist';
    setIsInWishlist(!isInWishlist);

    if (onWishlistToggle) {
      await onWishlistToggle(game.id, newStatus);
    }
  };

  const handleAddToCollectionClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', `/game/${game.slug || game.id}`);
      toast.error('Log in to add games to your collection');
      return;
    }

    setIsCollectionModalOpen(true);
  };

  // Obtener artwork (banner superior)
  const artwork = game.screenshots?.[0]?.url || game.artworks?.[0]?.url || game.cover?.url;
  const artworkUrl = artwork
    ? formatIGDBImage(artwork, 't_screenshot_med')
    : getGameCover(game);

  // Cover (círculo)
  const coverUrl = getGameCover(game);

  // Género y año
  const genre = game.genres?.[0]?.name || 'Unknown';
  const genreId = game.genres?.[0]?.id;
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : 'TBA';

  return (
    <div className="relative h-full">
      <div
        onClick={() => navigate(`/game/${game.slug || game.id}`)}
        className="bg-primary-navy-dark rounded-2xl overflow-hidden hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 cursor-pointer group h-full flex flex-col"
      >
        {/* Header con Countdown */}
        <div className="h-16 px-4 relative flex items-center justify-between w-full">
          {/* Countdown Badge */}
          <div className={`absolute left-4 top-4 flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold ${countdown.color}`}>
            <Clock size={14} />
            {countdown.text}
          </div>

          {/* IGDB Rating (si existe) */}
          {game.rating && (
            <div className="ml-auto mr-12">
              <RatingBadge rating={game.rating} size="sm" />
            </div>
          )}

          <div className="absolute right-4 top-4 z-30" data-card-menu={cardId}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleOptionsMenu();
              }}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>

            {/* Options Dropdown */}
            {showOptionsMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-48 bg-[#1e2330] rounded-lg shadow-xl border border-gray-700 py-1 z-50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Like option */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeOptionsMenu();
                    if (!user) {
                      toast.error('Log in to like games');
                      return;
                    }
                    toggleLike(game.name, game.cover?.image_id);
                  }}
                  disabled={toggling}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${liked
                    ? 'text-pink-400 hover:bg-gray-800'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-pink-400'
                    } ${toggling ? 'opacity-60 cursor-wait' : ''}`}
                >
                  <Heart size={16} className={liked ? 'fill-pink-400' : ''} />
                  <span>{liked ? `Unlike${likesCount > 0 ? ` (${likesCount})` : ''}` : `Like${likesCount > 0 ? ` (${likesCount})` : ''}`}</span>
                </button>

                {showAddButton && (
                  <button
                    type="button"
                    onClick={(e) => {
                      closeOptionsMenu();
                      handleAddToCollectionClick(e);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-primary-yellow transition-colors"
                  >
                    <FolderPlus size={16} />
                    <span>Add to Collection</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Artwork Banner */}
        <div className="mx-4 mb-8">
          <img
            src={artworkUrl}
            alt={game.name}
            className="w-full h-32 object-cover rounded-lg"
            loading="lazy"
            onError={(e) => {
              e.target.src = PLACEHOLDER_COVER;
            }}
          />
        </div>

        {/* Cover Circular (mitad incrustado) */}
        <div className="flex justify-center -mt-12 mb-3">
          <img
            src={coverUrl}
            alt={game.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary-navy-dark group-hover:border-primary-yellow transition-colors"
            loading="lazy"
          />
        </div>

        {/* Info del juego */}
        <div className="px-4 pb-4 text-center flex flex-col flex-grow">
          <h3 className="text-white font-bold text-base mb-1 line-clamp-2 min-h-[3rem]">
            {game.name}
          </h3>
          <p className="text-gray-400 text-sm mb-3 relative z-20">
            {genreId ? (
              <span
                className="hover:text-primary-yellow hover:underline transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/explore?genres=${genreId}`);
                }}
              >
                {genre}
              </span>
            ) : (
              genre
            )} • {year}
          </p>

          {/* Botón Wishlist */}
          <div className="mt-auto">
            {showWishlistButton && (
              <button
                type="button"
                onClick={handleWishlistClick}
                className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${isInWishlist
                  ? 'bg-primary-yellow/20 text-primary-yellow border border-primary-yellow hover:bg-primary-yellow/30'
                  : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                  }`}
              >
                {isInWishlist ? (
                  <>
                    <Check size={16} />
                    In Wishlist
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add to Wishlist
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add to Collection Modal */}
      {
        isCollectionModalOpen && (
          <AddToCollectionModal
            isOpen={isCollectionModalOpen}
            onClose={() => setIsCollectionModalOpen(false)}
            game={game}
          />
        )
      }
    </div >
  );
};

export default memo(AnticipatedGameCard);