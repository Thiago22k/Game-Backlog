import { useNavigate } from 'react-router-dom';
import { getGameCover } from '../../utils/formatters';

const SimilarGames = ({ game }) => {
  const navigate = useNavigate();

  // Si no hay juegos similares, mostrar mensaje
  if (!game.similar_games || game.similar_games.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Juegos similares</h3>
        <p className="text-gray-500 text-sm">No hay juegos similares disponibles.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Juegos similares</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {game.similar_games.slice(0, 4).map((similarGame) => (
          <div
            key={similarGame.id}
            onClick={() => navigate(`/game/${similarGame.slug || similarGame.id}`)}
            className="cursor-pointer group"
          >
            <img
              src={getGameCover(similarGame)}
              alt={similarGame.name}
              className="w-full h-48 object-cover rounded-lg group-hover:opacity-75 transition-opacity"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover';
              }}
            />
            <p className="mt-2 text-sm font-medium text-gray-900 truncate">
              {similarGame.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimilarGames;