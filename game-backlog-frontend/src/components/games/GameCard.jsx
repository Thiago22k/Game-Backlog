import { useNavigate } from 'react-router-dom';
import RatingBadge from '../common/RatingBadge';
import { getGameCover, PLACEHOLDER_COVER } from '../../utils/formatters';

const GameCard = ({ game, onAdd, onEdit, onDelete, showActions = true }) => {
  const navigate = useNavigate();

  // Detectar si es un juego del usuario
  const isUserGame = !!game.status;

  // ID del juego (varía según contexto)
  const gameId = game.slug || game.igdb_game_id || game.id;

  // Extraer info del juego
  const name = game.name || game.game_details?.name || 'Sin nombre';
  const cover = game.cover?.url || game.game_details?.cover?.url;
  const igdbRating = game.rating || game.game_details?.rating;
  const status = game.status;

  // Rating del usuario: solo relevante si es un juego del usuario
  const userRating = isUserGame ? game.rating : null;

  // Formatear URL de cover
  const coverUrl = getGameCover(game);

  // Traducir status
  const statusLabels = {
    completed: 'Completado',
    playing: 'Jugando',
    wishlist: 'Lista de deseos',
    dropped: 'Abandonado',
    backlog: 'Backlog',
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover del juego - CLICKEABLE */}
      <div
        className="relative cursor-pointer"
        onClick={() => navigate(`/game/${gameId}`)}
      >
        <img
          src={coverUrl}
          alt={name}
          className="w-full h-64 object-cover"
          onError={(e) => {
            e.target.src = PLACEHOLDER_COVER;
          }}
        />
      </div>

      {/* Info del juego */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 truncate" title={name}>
          {name}
        </h3>

        {/* Rating de IGDB (solo si NO es un juego del usuario) */}
        {!isUserGame && igdbRating && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-600">IGDB:</span>
            <RatingBadge rating={igdbRating} size="sm" />
          </div>
        )}

        {/* Status del usuario (solo si es un juego del usuario) */}
        {isUserGame && status && (
          <div className="mb-2">
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${status === 'completed' ? 'bg-green-100 text-green-800' :
              status === 'playing' ? 'bg-blue-100 text-blue-800' :
                status === 'wishlist' ? 'bg-yellow-100 text-yellow-800' :
                  status === 'backlog' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
              }`}>
              {statusLabels[status]}
            </span>
          </div>
        )}

        {/* Rating del usuario (solo si es un juego del usuario Y tiene rating) */}
        {isUserGame && userRating && userRating >= 1 && userRating <= 5 && (
          <div className="mb-2">
            <span className="text-sm text-gray-700">
              Tu calificación: {'⭐'.repeat(userRating)}
            </span>
          </div>
        )}

        {/* Acciones */}
        {showActions && (
          <div className="mt-4 flex space-x-2">
            {onAdd && (
              <button
                onClick={() => onAdd(game)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Agregar
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(game)}
                className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Editar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(game)}
                className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCard;