import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';
import GameGrid from '../components/games/GameGrid';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const [popularGames, setPopularGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [anticipatedGames, setAnticipatedGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchGames = async () => {
    try {
      const [popularRes, recentRes, anticipatedRes] = await Promise.all([
        axios.get(`${ENDPOINTS.GAMES.POPULAR}?limit=10`),
        axios.get(`${ENDPOINTS.GAMES.RECENT}?limit=10`),
        axios.get(`${ENDPOINTS.GAMES.ANTICIPATED}?limit=10`)
      ]);

      setPopularGames(popularRes.data.games);
      setRecentGames(recentRes.data.games);
      setAnticipatedGames(anticipatedRes.data.games);
    } catch (error) {
      console.error('Error cargando juegos:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchGames();
}, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Game Backlog
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Organiza tu colección de videojuegos, marca tus completados y lleva un registro de todo lo que has jugado.
          </p>

          {!isAuthenticated ? (
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 transition"
              >
                Comenzar gratis
              </Link>
              <Link
                to="/explore"
                className="bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-600 transition border-2 border-white"
              >
                Explorar juegos
              </Link>
            </div>
          ) : (
            <Link
              to="/profile"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 transition"
            >
              Ir a mi perfil
            </Link>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Juegos populares */}
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">Cargando juegos...</p>
          </div>
        ) : (
          <>
            <GameGrid 
              games={popularGames} 
              title="🔥 Populares ahora" 
              viewAllLink="/explore"
            />

            <GameGrid 
              games={anticipatedGames}  // ← Nuevo
              title="⏳ Más esperados" 
              viewAllLink="/explore"
              showReleaseDate={true}
            />

            <GameGrid 
              games={recentGames} 
              title="🆕 Lanzamientos recientes" 
              viewAllLink="/explore"
            />
          </>
        )}

        {/* Features */}
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ¿Por qué usar Game Backlog?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Organiza tu backlog
              </h3>
              <p className="text-gray-600">
                Lleva un registro de todos los juegos que quieres jugar y los que ya completaste.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Califica tus juegos
              </h3>
              <p className="text-gray-600">
                Asigna puntuaciones de 1 a 5 estrellas a cada juego que completes.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Descubre nuevos títulos
              </h3>
              <p className="text-gray-600">
                Explora miles de juegos gracias a la integración con IGDB.
              </p>
            </div>
          </div>
        </div>

        {/* CTA final */}
        {!isAuthenticated && (
          <div className="py-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Empieza a organizar tu backlog hoy
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Únete a otros jugadores que ya están organizando su colección de videojuegos.
            </p>
            <Link
              to="/register"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
            >
              Crear cuenta gratis
            </Link>
          </div>
        )}
      </div>

      {/* Footer simple */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 Game Backlog. Datos de juegos proporcionados por IGDB.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;