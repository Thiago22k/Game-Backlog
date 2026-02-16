import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';

import Navbar from '../components/layout/Navbar';
import GameHero from '../components/games/GameHero';
import GameStats from '../components/games/GameStats';
import UserGameInfo from '../components/games/UserGameInfo';
import GameSummary from '../components/games/GameSummary';
import ScreenshotGallery from '../components/games/ScreenshotGallery';
import SimilarGames from '../components/games/SimilarGames';

const GameDetails = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addGame, updateGame, getUserGames } = useGames();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [userGame, setUserGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal de agregar/editar
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' o 'edit'
  const [modalStatus, setModalStatus] = useState('completed');
  const [modalRating, setModalRating] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Cargar datos del juego
  useEffect(() => {
    const fetchGameData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Obtener detalles del juego de IGDB
        const response = await axios.get(`${ENDPOINTS.GAMES.SEARCH.replace('/search', '')}/igdb/${id}`);
        setGame(response.data.game);

        // Si está autenticado, verificar si el juego está en su lista
        if (isAuthenticated) {
          const userGamesResult = await getUserGames();
          if (userGamesResult.success) {
            const foundGame = userGamesResult.data.find(
              g => g.igdb_game_id === parseInt(id)
            );
            setUserGame(foundGame || null);
          }
        }
      } catch (err) {
        console.error('Error cargando juego:', err);
        setError('No se pudo cargar la información del juego');
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [id, isAuthenticated]);

  // Manejar acción del botón (agregar o editar)
  const handleAction = (action) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (action === 'add') {
      setModalMode('add');
      setModalStatus('completed');
      setModalRating(null);
    } else if (action === 'edit') {
      setModalMode('edit');
      setModalStatus(userGame.status);
      setModalRating(userGame.rating);
    }

    setShowModal(true);
    setModalError('');
    setModalSuccess('');
  };

  // Guardar (agregar o editar)
  const handleSave = async () => {
    setModalLoading(true);
    setModalError('');

    let result;
    if (modalMode === 'add') {
      result = await addGame(parseInt(id), modalStatus, modalRating);
    } else {
      result = await updateGame(parseInt(id), modalStatus, modalRating);
    }

    if (result.success) {
      setModalSuccess(modalMode === 'add' ? 'Juego agregado' : 'Juego actualizado');
      
      // Recargar datos del usuario
      const userGamesResult = await getUserGames();
      if (userGamesResult.success) {
        const foundGame = userGamesResult.data.find(
          g => g.igdb_game_id === parseInt(id)
        );
        setUserGame(foundGame || null);
      }

      setTimeout(() => {
        setShowModal(false);
        setModalSuccess('');
      }, 1500);
    } else {
      setModalError(result.error);
    }

    setModalLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-600">Cargando detalles del juego...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Juego no encontrado'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Volver a explorar
          </button>
        </div>
      </div>
    </div>
  );
}

// Agregar validación adicional después de verificar que game existe
if (!game.name) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Este juego no tiene información disponible en IGDB.</p>
          <button
            onClick={() => navigate('/explore')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Volver a explorar
          </button>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <GameHero game={game} userGame={userGame} onAction={handleAction} />

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            <GameSummary game={game} />
            <ScreenshotGallery game={game} />
            <SimilarGames game={game} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <GameStats game={game} />
            {isAuthenticated && <UserGameInfo userGame={userGame} />}
          </div>

        </div>
      </div>

      {/* Modal agregar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {modalMode === 'add' ? `Agregar "${game.name}"` : `Editar "${game.name}"`}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="completed">Completado</option>
                <option value="playing">Jugando</option>
                <option value="wishlist">Lista de deseos</option>
                <option value="dropped">Abandonado</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calificación
              </label>
              <select
                value={modalRating || ''}
                onChange={(e) => setModalRating(e.target.value ? parseInt(e.target.value) : null)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Sin calificación</option>
                <option value="1">⭐ 1</option>
                <option value="2">⭐⭐ 2</option>
                <option value="3">⭐⭐⭐ 3</option>
                <option value="4">⭐⭐⭐⭐ 4</option>
                <option value="5">⭐⭐⭐⭐⭐ 5</option>
              </select>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {modalSuccess}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                disabled={modalLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={modalLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {modalLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDetails;