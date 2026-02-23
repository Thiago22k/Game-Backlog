import { getGameBanner, getGameCover } from '../../utils/formatters';

const GameHero = ({ game, userGame, onAction }) => {
  const banner = getGameBanner(game);
  const cover = getGameCover(game);
  const rating = game.rating ? Math.round(game.rating) : null;
  const name = game.name || 'Sin título';

  const statusLabels = {
    completed: 'Completado',
    playing: 'Jugando',
    wishlist: 'Lista de deseos',
    wishlist: 'Lista de deseos',
    dropped: 'Abandonado',
    backlog: 'Backlog',
  };

  return (
    <div className="relative bg-gray-900">
      {/* Banner de fondo */}
      {banner && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
          style={{ backgroundImage: `url(${banner})` }}
        />
      )}

      {/* Contenido */}
      <div className="relative max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Cover */}
          <img
            src={cover}
            alt={game.name}
            className="w-48 h-64 object-cover rounded-lg shadow-2xl"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover';
            }}
          />

          {/* Info */}
          <div className="flex-1 text-white">
            <h1 className="text-4xl font-bold mb-4">{game.name}</h1>

            {/* Rating de IGDB */}
            {rating && (
              <div className="mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">Rating IGDB:</span>
                  <div className="flex-1 max-w-xs bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{ width: `${rating}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold">{rating}/100</span>
                </div>
              </div>
            )}

            {/* Botón de acción */}
            <div className="flex items-center space-x-4">
              {userGame ? (
                <>
                  <span className={`inline-block px-4 py-2 text-sm font-semibold rounded ${userGame.status === 'completed' ? 'bg-green-600' :
                      userGame.status === 'playing' ? 'bg-blue-600' :
                        userGame.status === 'wishlist' ? 'bg-yellow-600' :
                          userGame.status === 'backlog' ? 'bg-purple-600' :
                            'bg-gray-600'
                    }`}>
                    {statusLabels[userGame.status]}
                  </span>
                  <button
                    onClick={() => onAction('edit')}
                    className="bg-white text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-gray-100"
                  >
                    Editar mi entrada
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onAction('add')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Agregar a mi lista
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHero;