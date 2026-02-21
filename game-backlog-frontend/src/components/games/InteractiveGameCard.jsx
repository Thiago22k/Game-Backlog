import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Play, ShoppingCart, Trash2, HelpCircle } from 'lucide-react';
import { getGameCover, formatIGDBImage } from '../../utils/formatters';
import StatusMenu from './StatusMenu';
import StarRating from './StarRating';
import RatingBadge from '../common/RatingBadge';

const InteractiveGameCard = ({ game, interactive = false, onStatusChange, onRatingChange }) => {
  const navigate = useNavigate();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

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
      navigate('/login');
      return;
    }

    setShowStatusMenu(true);
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
      case 'dropped':
        return { Icon: Trash2, color: 'bg-red-600' };
      default:
        return { Icon: HelpCircle, color: 'bg-gray-600' };
    }
  };

  const { Icon: StatusIcon, color: statusColor } = getStatusIcon();

  return (
    <div className="relative">
      {/* Card Container - Mismo estilo que AnticipatedGameCard */}
      <div
        onClick={() => navigate(`/game/${game.slug || game.id}`)}
        className="bg-primary-navy-dark rounded-2xl overflow-hidden hover:ring-2 hover:ring-primary-yellow transition-all cursor-pointer group"
      >
        {/* Header con Status y Rating */}
        <div className="h-12 flex items-center justify-between px-4">
          {/* Status Button (izquierda) */}
          <button
            type="button"
            onClick={handleStatusClick}
            className={`p-2 rounded-full ${statusColor} transition-transform ${interactive ? 'hover:scale-110' : ''
              }`}
          >
            <StatusIcon size={16} className="text-white" />
          </button>

          {/* Star Rating (centro) - Solo si tiene estado */}
          {currentStatus && (
            <div
              onClick={(e) => e.stopPropagation()}
            >
              <StarRating
                rating={currentRating}
                onRate={handleRatingClick}
                interactive={interactive}
              />
            </div>
          )}

          {/* IGDB Rating (derecha) */}
          <RatingBadge rating={game.rating} size="sm" />
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
        <div className="px-4 pb-4 text-center">
          <h3 className="text-white font-bold text-base mb-1 line-clamp-2 min-h-[3rem]">
            {game.name}
          </h3>
          <p className="text-gray-400 text-sm">
            {genre} • {year}
          </p>
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
    </div>
  );
};

export default InteractiveGameCard;