import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Bienvenido, {user?.username}
            </h2>
            
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Usuario:</strong> {user?.username}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Email:</strong> {user?.email}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>ID:</strong> {user?.id}
                </p>
              </div>

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => navigate('/settings')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;