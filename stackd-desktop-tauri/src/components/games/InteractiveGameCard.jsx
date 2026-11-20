import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Play, ShoppingCart, Trash2, Plus, FolderPlus, MoreHorizontal, Archive, Heart, Sparkles } from 'lucide-react';
import { getGameCover, formatIGDBImage, PLACEHOLDER_COVER } from '../../utils/formatters';
import SteamIcon from '../../assets/steam-icon.svg?react';
import StatusMenu from './StatusMenu';
import StarRating from './StarRating';
import AddToCollectionModal from '../collections/AddToCollectionModal';
import { useGameLikes } from '../../hooks/useGameLikes';
import { useCardMenu } from '../../hooks/useCardMenu';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const InteractiveGameCard = ({ game, interactive = false, onStatusChange, onRatingChange, showStatus = true, showAddButton = true, showMatchBadge = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const cardId = `interactive-${game.id}`;
  const { isOpen: showOptionsMenu, open: openOptionsMenu, close: closeOptionsMenu, toggle: toggleOptionsMenu } = useCardMenu(cardId);
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
  const genreId = game.genres?.[0]?.id;
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : 'TBA';

  const handleStatusClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!interactive) {
      sessionStorage.setItem('redirectAfterLogin', `/game/${game.slug || game.id}`);
      toast.error('Log in to add games to your library');
      return;
    }

    setShowStatusMenu(true);
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
        return { Icon: Plus, color: 'bg-primary-violet' };
    }
  };

  const { Icon: StatusIcon, color: statusColor } = getStatusIcon();
  const statusTooltip = currentStatus ? 'Change status' : 'Add to library';

  return (
    <div className="relative h-full">
      {/* Card Container - Mismo estilo que AnticipatedGameCard */}
      <div
        onClick={() => navigate(`/game/${game.slug || game.id}`)}
        className="bg-primary-navy-dark rounded-2xl overflow-hidden hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 cursor-pointer group h-full flex flex-col"
      >
        {/* Header con Status y Rating */}
        <div className="h-16 px-4 relative flex items-center justify-center w-full">
          {/* Status Button (izquierda) */}
          {showStatus && (
            <div className="absolute left-4 top-4 group/badge">
              <button
                type="button"
                onClick={handleStatusClick}
                className={`p-2 rounded-md ${statusColor} transition-transform ${interactive ? 'hover:scale-110' : ''}`}
              >
                <StatusIcon size={16} className="text-white" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-0 top-full mt-1.5 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover/badge:opacity-100 transition-opacity duration-150 shadow-lg z-50">
                {statusTooltip}
              </div>
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
        <div className="mx-4 mb-8 relative">
          <img
            src={artworkUrl}
            alt={game.name}
            className="w-full h-32 object-cover rounded-lg"
            loading="lazy"
            onError={(e) => {
              e.target.src = PLACEHOLDER_COVER;
            }}
          />
          {game.source === 'steam' && (
            <span
              title="Imported from Steam"
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#171a21]/90 backdrop-blur-sm border border-[#00adee]/30 text-[10px] font-semibold text-[#00adee] shadow-md"
            >
              <SteamIcon className="w-3 h-3 fill-[#00adee]" />
              Steam
            </span>
          )}
          {showMatchBadge && game.match_percent && (
            <span
              title={`${game.match_percent}% affinity match`}
              className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-primary-yellow/40 text-[10px] font-extrabold text-primary-yellow shadow-md"
            >
              <Sparkles className="w-3 h-3" />
              {game.match_percent}%
            </span>
          )}
        </div>

        {/* Cover Circular (mitad incrustado) */}
        <div className="flex justify-center -mt-12 z-10 mb-3">
          <img
            src={coverUrl}
            alt={game.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary-navy-dark group-hover:border-primary-yellow transition-colors"
            loading="lazy"
          />
        </div>

        {/* Info del juego */}
        <div className="px-4 pb-5 text-center relative flex flex-col flex-grow">
          <h3 className="text-white font-bold text-base mb-1 line-clamp-2 min-h-[3rem] px-6" title={game.name}>
            {game.name}
          </h3>
          <div className="mt-auto">
            <p className="text-gray-400 text-sm relative z-20">
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
          </div>
        </div>
      </div>

      {/* Status Menu */}
      {
        showStatusMenu && (
          <StatusMenu
            currentStatus={currentStatus}
            onSelect={handleStatusSelect}
            onClose={() => setShowStatusMenu(false)}
          />
        )
      }

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

export default memo(InteractiveGameCard);