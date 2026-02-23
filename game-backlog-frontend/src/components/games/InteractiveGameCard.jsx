import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Play, ShoppingCart, Trash2, HelpCircle, FolderPlus, MoreVertical, Archive, Heart } from 'lucide-react';
import { getGameCover, formatIGDBImage } from '../../utils/formatters';
import StatusMenu from './StatusMenu';
import StarRating from './StarRating';
import AddToCollectionModal from '../collections/AddToCollectionModal';
import { useGameLikes } from '../../hooks/useGameLikes';
import { useCardMenu } from '../../hooks/useCardMenu';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const InteractiveGameCard = ({ game, interactive = false, onStatusChange, onRatingChange, showStatus = true, showAddButton = true }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const { isOpen: showOptionsMenu, open: openOptionsMenu, close: closeOptionsMenu, toggle: toggleOptionsMenu } = useCardMenu(`interactive-${game.id}`);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const { liked, likesCount, toggling, toggleLike } = useGameLikes(game.id);

  // Estados locales
  const [localStatus, setLocalStatus] = useState(game.status || null);
  const [localRating, setLocalRating] = useState(
    game.status ? (game.user_rating || 0) : 0
  );

  // Sincronizar con los props cuando cambien
  useEffect(() => {
    setLocalStatus(game.status || null);
    setLocalRating(game.status ? (game.user_rating || 0) : 0);
  }, [game.status, game.user_rating]);

  const currentStatus = localStatus;
  const currentRating = localRating;

  // Obtener artwork (banner superior)
  const artwork = game.artworks?.[0]?.url || game.cover?.url;
  const artworkUrl = artwork
    ? formatIGDBImage(artwork)
    : getGameCover(game);

  // Cover (círculo)
  const coverUrl = getGameCover(game);

  // Género y año
  const genre = game.genres?.[0]?.name || 'Unknown';
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : 'TBA';

  const handleStatusClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!interactive) {
      localStorage.setItem('redirectAfterLogin', `/game/${game.slug || game.id}`);
      toast.error('Log in to add games to your library');
      return;
    }

    setShowStatusMenu(true);
  };

  const handleAddToCollectionClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      localStorage.setItem('redirectAfterLogin', `/game/${game.slug || game.id}`);
      toast.error('Log in to add games to your collection');
      return;
    }

    setIsCollectionModalOpen(true);
  };

  const handleStatusSelect = async (newStatus) => {
    setShowStatusMenu(false);
    setLocalStatus(newStatus);

    if (!newStatus) {
      setLocalRating(0);
    }

    if (onStatusChange) {
      await onStatusChange(game.id, newStatus, localRating);
    }
  };

  const handleRatingClick = async (rating) => {
    setLocalRating(rating);
    if (onRatingChange) {
      await onRatingChange(game.id, rating);
    }
  };

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'completed':
        return { Icon: Check, color: 'bg-green-600' };
      case 'playing':
        return { Icon: Play, color: 'bg-blue-600' };
      case 'wishlist':
        return { Icon: ShoppingCart, color: 'bg-cyan-600' };
      case 'backlog':
        return { Icon: Archive, color: 'bg-purple-600' };
      case 'dropped':
        return { Icon: Trash2, color: 'bg-red-600' };
      default:
        return { Icon: HelpCircle, color: 'bg-gray-600' };
    }
  };

  const { Icon: StatusIcon, color: statusColor } = getStatusIcon();

  return (
    <div className="relative h-full">
      {/* Card Container - Mismo estilo que AnticipatedGameCard */}
      <div
        onClick={() => navigate(`/game/${game.slug || game.id}`)}
        className="bg-primary-navy-dark rounded-2xl overflow-hidden hover:ring-2 hover:ring-primary-yellow transition-all cursor-pointer group h-full flex flex-col"
      >
        {/* Header con Status y Rating */}
        <div className="h-12 px-4 relative flex items-center justify-center w-full">
          {/* Status Button (izquierda) */}
          {showStatus && (
            <div className="absolute left-4">
              <button
                type="button"
                onClick={handleStatusClick}
                className={`p-2 rounded-full ${statusColor} transition-transform ${interactive ? 'hover:scale-110' : ''}`}
              >
                <StatusIcon size={16} className="text-white" />
              </button>
            </div>
          )}

          {/* Star Rating (centro) - Solo si tiene estado */}
          {currentStatus && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={!showStatus ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}
            >
              <StarRating
                rating={currentRating}
                onRate={handleRatingClick}
                interactive={interactive}
              />
            </div>
          )}

          {/* Options Menu Button (derecha) */}
          <div className="absolute right-2 z-30">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleOptionsMenu();
              }}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <MoreVertical size={20} />
            </button>

            {/* Options Dropdown */}
            {showOptionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeOptionsMenu();
                  }}
                />
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
              </>
            )}
          </div>
        </div>

        {/* Artwork Banner */}
        <div className="mx-4 mb-8">
          <img
            src={artworkUrl}
            alt={game.name}
            className="w-full h-32 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = coverUrl;
            }}
          />
        </div>

        {/* Cover Circular (mitad incrustado) */}
        <div className="flex justify-center -mt-12 mb-3">
          <img
            src={coverUrl}
            alt={game.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary-navy-dark group-hover:border-primary-yellow transition-colors"
          />
        </div>

        {/* Info del juego */}
        <div className="px-4 pb-5 text-center relative flex flex-col flex-grow">
          <h3 className="text-white font-bold text-base mb-1 line-clamp-2 min-h-[3rem] px-6" title={game.name}>
            {game.name}
          </h3>
          <div className="mt-auto">
            <p className="text-gray-400 text-sm">
              {genre} • {year}
            </p>
          </div>
        </div>
      </div>

      {/* Status Menu */}
      {showStatusMenu && (
        <StatusMenu
          currentStatus={currentStatus}
          onSelect={handleStatusSelect}
          onClose={() => setShowStatusMenu(false)}
        />
      )}

      {/* Add to Collection Modal */}
      {isCollectionModalOpen && (
        <AddToCollectionModal
          isOpen={isCollectionModalOpen}
          onClose={() => setIsCollectionModalOpen(false)}
          game={game}
        />
      )}
    </div>
  );
};

export default InteractiveGameCard;