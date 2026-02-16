import { formatReleaseDate } from '../../utils/formatters';

const UserGameInfo = ({ userGame }) => {
  if (!userGame) return null;

  const statusLabels = {
    completed: 'Completado',
    playing: 'Jugando',
    wishlist: 'Lista de deseos',
    dropped: 'Abandonado',
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tu registro</h3>
      
      <div className="space-y-3">
        {/* Estado */}
        <div>
          <p className="text-sm font-medium text-gray-500">Estado</p>
          <span className={`inline-block mt-1 px-3 py-1 text-sm font-semibold rounded ${
            userGame.status === 'completed' ? 'bg-green-100 text-green-800' :
            userGame.status === 'playing' ? 'bg-blue-100 text-blue-800' :
            userGame.status === 'wishlist' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {statusLabels[userGame.status]}
          </span>
        </div>

        {/* Calificación */}
        {userGame.rating && (
          <div>
            <p className="text-sm font-medium text-gray-500">Tu calificación</p>
            <p className="text-2xl">{'⭐'.repeat(userGame.rating)}</p>
            <p className="text-sm text-gray-600">{userGame.rating}/5</p>
          </div>
        )}

        {/* Fecha agregado */}
        {userGame.created_at && (
          <div>
            <p className="text-sm font-medium text-gray-500">Agregado</p>
            <p className="text-gray-900">{formatReleaseDate(new Date(userGame.created_at).getTime() / 1000)}</p>
          </div>
        )}

        {/* Fecha completado */}
        {userGame.completed_at && (
          <div>
            <p className="text-sm font-medium text-gray-500">Completado</p>
            <p className="text-gray-900">{formatReleaseDate(new Date(userGame.completed_at).getTime() / 1000)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserGameInfo;