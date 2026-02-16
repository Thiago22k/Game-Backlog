import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import Navbar from '../components/layout/Navbar';
import GameCard from '../components/games/GameCard';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { games, loading, getUserGames, updateGame, deleteGame } = useGames();

  // Modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRating, setEditRating] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Cargar juegos al montar el componente
  useEffect(() => {
    getUserGames();
  }, []);

  // Abrir modal de edición
  const handleEditClick = (game) => {
    setSelectedGame(game);
    setEditStatus(game.status);
    setEditRating(game.rating);
    setShowEditModal(true);
    setEditError('');
    setEditSuccess('');
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    setEditLoading(true);
    setEditError('');

    const result = await updateGame(selectedGame.igdb_game_id, editStatus, editRating);

    if (result.success) {
      setEditSuccess('Juego actualizado exitosamente');
      // Recargar lista
      await getUserGames();
      setTimeout(() => {
        setShowEditModal(false);
        setEditSuccess('');
      }, 1500);
    } else {
      setEditError(result.error);
    }

    setEditLoading(false);
  };

  // Eliminar juego
  const handleDeleteClick = async (game) => {
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar "${game.game_details?.name || 'este juego'}" de tu lista?`);
    
    if (confirmDelete) {
      const result = await deleteGame(game.igdb_game_id);
      
      if (result.success) {
        // La lista se actualiza automáticamente en el hook
      } else {
        alert('Error al eliminar el juego');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Bienvenido, {user?.username}
              </h2>
              <p className="text-gray-600 mt-1">
                {games.length} juego(s) en tu lista
              </p>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Configuración
            </button>
          </div>

          {/* Lista de juegos */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Cargando tus juegos...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600 mb-4">
                No tienes juegos en tu lista aún.
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Explorar juegos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de edición */}
      {showEditModal && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Editar "{selectedGame.game_details?.name || 'juego'}"
            </h3>

            {/* Seleccionar status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="completed">Completado</option>
                <option value="playing">Jugando</option>
                <option value="wishlist">Lista de deseos</option>
                <option value="dropped">Abandonado</option>
              </select>
            </div>

            {/* Seleccionar rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calificación
              </label>
              <select
                value={editRating || ''}
                onChange={(e) => setEditRating(e.target.value ? parseInt(e.target.value) : null)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sin calificación</option>
                <option value="1">⭐ 1</option>
                <option value="2">⭐⭐ 2</option>
                <option value="3">⭐⭐⭐ 3</option>
                <option value="4">⭐⭐⭐⭐ 4</option>
                <option value="5">⭐⭐⭐⭐⭐ 5</option>
              </select>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {editSuccess}
              </div>
            )}

            {/* Botones */}
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditError('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                disabled={editLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;