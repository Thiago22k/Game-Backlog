import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Play, ShoppingCart, Trash2, HelpCircle } from 'lucide-react';
import { getGameCover, formatIGDBImage } from '../../utils/formatters';
import StatusMenu from './StatusMenu';
import StarRating from './StarRating';

const InteractiveGameCard = ({ game, interactive = false, onStatusChange, onRatingChange }) => {
  const navigate = useNavigate();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Estados locales
  const [localStatus, setLocalStatus] = useState(game.status || null);
  // Solo usar game.rating como rating personal si el juego tiene status
  // Si no tiene status, game.rating es de IGDB y no debemos usarlo
  const [localRating, setLocalRating] = useState(
    game.status ? (game.rating || 0) : 0
  );

  const currentStatus = localStatus;
  const currentRating = localRating;

  // Obtener artwork (banner horizontal)
  const artwork = game.artworks?.[0]?.url || game.screenshots?.[0]?.url;
  const artworkUrl = artwork 
    ? formatIGDBImage(artwork, 't_screenshot_med')
    : getGameCover(game);

  // Obtener cover (círculo)
  const coverUrl = getGameCover(game);

  // Obtener género y año
  const genre = game.genres?.[0]?.name || 'Unknown';
  const year = game.first_release_date 
    ? new Date(game.first_release_date * 1000).getFullYear()
    : 'TBA';

  const handleStatusClick = (e) => {
    e.stopPropagation();
    
    // Si no está autenticado, redirigir a login
    if (!interactive) {
      localStorage.setItem('redirectAfterLogin', `/game/${game.id}`);
      navigate('/login');
      return;
    }

    setShowStatusMenu(true);
  };

  const handleStatusSelect = async (newStatus) => {
    setLocalStatus(newStatus);
    if (!newStatus) {
      setLocalRating(0);
    }
    if (onStatusChange) {
      await onStatusChange(game.id, newStatus);
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
      {/* Card Container */}
      <div 
        onClick={() => navigate(`/game/${game.id}`)}
        className="bg-primary-navy-dark rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
      >
        {/* Header con iconos y estrellas */}
        <div className="relative h-12 flex items-center justify-between px-3">
          {/* Status Button (izquierda) */}
          <button
            onClick={handleStatusClick}
            className={`p-2 rounded ${statusColor} transition-transform shadow-lg z-20 ${
            interactive ? 'hover:scale-110 cursor-pointer' : 'cursor-pointer'
            }`}
          >
            <StatusIcon size={18} className="text-white" />
          </button>

          {/* Star Rating (centro) - Solo si tiene estado */}
          {currentStatus && (
            <div 
              className="absolute left-1/2 transform -translate-x-1/2 z-20"
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
          {game.rating && (
            <div className="bg-primary-yellow text-primary-navy px-2 py-1 rounded text-xs font-bold z-20">
              {Math.round(game.rating)}
              <div className="text-[8px] leading-none">IGDB</div>
            </div>
          )}
        </div>

        {/* Artwork Banner */}
<div className="relative h-32 mx-4 rounded-lg overflow-hidden">
  <img
    src={artworkUrl}
    alt=""
    className="w-full h-full object-cover"
    onError={(e) => {
      e.target.src = 'https://via.placeholder.com/400x200?text=No+Banner';
    }}
  />
  
  {/* Gradient overlay bottom */}
  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-primary-navy-dark to-transparent" />
</div>

        {/* Cover Circle - Posicionado mitad arriba del artwork */}
        <div className="flex justify-center -mt-12 relative z-10">
          <div className="bg-primary-navy-dark rounded-full p-2">
            <img
              src={coverUrl}
              alt={game.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary-navy-dark"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/96x96?text=?';
              }}
            />
          </div>
        </div>

        {/* Game Info */}
        <div className="px-4 pb-4 pt-2 text-center">
          <h3 className="text-white font-bold text-lg mb-1 truncate" title={game.name}>
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