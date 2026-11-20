import { formatReleaseDate } from '../../utils/formatters';

const GameStats = ({ game }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Información</h3>
      
      <div className="space-y-3">
        {/* Fecha de lanzamiento */}
        <div>
          <p className="text-sm font-medium text-gray-500">Lanzamiento</p>
          <p className="text-gray-900">
            {game.first_release_date 
              ? formatReleaseDate(game.first_release_date) 
              : 'Fecha desconocida'}
          </p>
        </div>

        {/* Plataformas */}
        <div>
          <p className="text-sm font-medium text-gray-500">Plataformas</p>
          {game.platforms && game.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {game.platforms.slice(0, 5).map((platform) => (
                <span
                  key={platform.id}
                  className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
                >
                  {platform.name}
                </span>
              ))}
              {game.platforms.length > 5 && (
                <span className="text-sm text-gray-500">+{game.platforms.length - 5} más</span>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No disponible</p>
          )}
        </div>

        {/* Géneros */}
        <div>
          <p className="text-sm font-medium text-gray-500">Géneros</p>
          {game.genres && game.genres.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {game.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No disponible</p>
          )}
        </div>

        {/* Desarrollador */}
        <div>
          <p className="text-sm font-medium text-gray-500">Desarrollador</p>
          <p className="text-gray-900">
            {game.involved_companies && game.involved_companies.length > 0
              ? game.involved_companies
                  .filter(ic => ic.developer)
                  .map(ic => ic.company.name)
                  .join(', ') || 'Desconocido'
              : 'Desconocido'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameStats;