import { useNavigate } from 'react-router-dom';
import { getGameCover, formatReleaseDate } from '../../utils/formatters';

const GameGrid = ({ games, title, viewAllLink, showReleaseDate = false }) => {
  const navigate = useNavigate();

  if (!games || games.length === 0) {
    return null;
  }

  return (
    <div className="py-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary-yellow">{title}</h2>
        {viewAllLink && (
          <button
            onClick={() => navigate(viewAllLink)}
            className="text-primary-yellow hover:text-opacity-80 font-medium transition-all"
          >
            View All →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            onClick={() => navigate(`/game/${game.id}`)}
            className="cursor-pointer group"
          >
            <div className="relative overflow-hidden rounded-lg shadow-md group-hover:shadow-xl transition-shadow">
              <img
                src={getGameCover(game)}
                alt={game.name}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/264x374?text=No+Cover';
                }}
              />
              {game.rating && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-primary-yellow px-2 py-1 rounded text-sm font-bold">
                  {Math.round(game.rating)}
                </div>
              )}
            </div>
            <h3 className="mt-3 font-semibold text-white truncate" title={game.name}>
              {game.name}
            </h3>
            {showReleaseDate && game.first_release_date && (
              <p className="text-sm text-gray-400">
                {formatReleaseDate(game.first_release_date)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameGrid;