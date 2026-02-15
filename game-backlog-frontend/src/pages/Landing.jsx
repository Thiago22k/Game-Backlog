import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          {/* Hero Section */}
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Game Backlog
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organiza tu colección de videojuegos, marca tus completados y lleva un registro de todo lo que has jugado.
          </p>

          {/* Botón principal */}
          {!isAuthenticated ? (
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
              >
                Comenzar
              </Link>
              <Link
                to="/login"
                className="bg-white text-gray-900 px-8 py-3 rounded-lg text-lg font-medium border border-gray-300 hover:bg-gray-50 transition"
              >
                Iniciar Sesión
              </Link>
            </div>
          ) : (
            <Link
              to="/profile"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
            >
              Ir a Mi Perfil
            </Link>
          )}

          {/* Features (opcional) */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📋 Organiza tu backlog
              </h3>
              <p className="text-gray-600">
                Lleva un registro de todos los juegos que quieres jugar.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ⭐ Califica tus juegos
              </h3>
              <p className="text-gray-600">
                Asigna puntuaciones de 1 a 5 a cada juego que completes.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🎮 Descubre nuevos títulos
              </h3>
              <p className="text-gray-600">
                Explora miles de juegos gracias a la integración con IGDB.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;