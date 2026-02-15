import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import Navbar from '../components/layout/Navbar';

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estados para cada sección
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: '',
  });

  const [usernameData, setUsernameData] = useState({
    newUsername: '',
    password: '',
  });

  const [deleteData, setDeleteData] = useState({
    password: '',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Estados de loading y errores
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [errorPassword, setErrorPassword] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorUsername, setErrorUsername] = useState('');
  const [errorDelete, setErrorDelete] = useState('');

  const [successPassword, setSuccessPassword] = useState('');
  const [successEmail, setSuccessEmail] = useState('');
  const [successUsername, setSuccessUsername] = useState('');

  // Cambiar contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorPassword('');
    setSuccessPassword('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorPassword('Las contraseñas no coinciden');
      return;
    }

    setLoadingPassword(true);

    try {
      await axios.put(ENDPOINTS.SETTINGS.CHANGE_PASSWORD, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccessPassword('Contraseña actualizada exitosamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setErrorPassword(error.response?.data?.error || 'Error al cambiar contraseña');
    }

    setLoadingPassword(false);
  };

  // Actualizar email
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setErrorEmail('');
    setSuccessEmail('');
    setLoadingEmail(true);

    try {
      await axios.put(ENDPOINTS.SETTINGS.UPDATE_EMAIL, {
        newEmail: emailData.newEmail,
        password: emailData.password,
      });

      setSuccessEmail('Email actualizado exitosamente');
      setEmailData({ newEmail: '', password: '' });
      
      // Recargar para actualizar el contexto con el nuevo email
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setErrorEmail(error.response?.data?.error || 'Error al actualizar email');
    }

    setLoadingEmail(false);
  };

  // Actualizar username
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setErrorUsername('');
    setSuccessUsername('');
    setLoadingUsername(true);

    try {
      await axios.put(ENDPOINTS.SETTINGS.UPDATE_USERNAME, {
        newUsername: usernameData.newUsername,
        password: usernameData.password,
      });

      setSuccessUsername('Username actualizado exitosamente');
      setUsernameData({ newUsername: '', password: '' });

      // Recargar para actualizar el contexto con el nuevo username
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setErrorUsername(error.response?.data?.error || 'Error al actualizar username');
    }

    setLoadingUsername(false);
  };

  // Eliminar cuenta
  const handleDeleteAccount = async () => {
    setErrorDelete('');
    setLoadingDelete(true);

    try {
      await axios.delete(ENDPOINTS.SETTINGS.DELETE_ACCOUNT, {
        data: { password: deleteData.password }
      });

      // Hacer logout y redirigir
      logout();
      navigate('/');
    } catch (error) {
      setErrorDelete(error.response?.data?.error || 'Error al eliminar cuenta');
      setLoadingDelete(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Configuración de cuenta</h1>

          <div className="space-y-6">
            {/* Información actual */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Información actual</h2>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>Username:</strong> {user?.username}
                </p>
                <p className="text-gray-700">
                  <strong>Email:</strong> {user?.email}
                </p>
              </div>
            </div>

            {/* Cambiar contraseña */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cambiar contraseña</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {errorPassword && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {errorPassword}
                  </div>
                )}
                {successPassword && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {successPassword}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
              </form>
            </div>

            {/* Actualizar email */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Actualizar email</h2>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nuevo email
                  </label>
                  <input
                    type="email"
                    required
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar con contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={emailData.password}
                    onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {errorEmail && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {errorEmail}
                  </div>
                )}
                {successEmail && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {successEmail}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingEmail}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingEmail ? 'Actualizando...' : 'Actualizar email'}
                </button>
              </form>
            </div>

            {/* Actualizar username */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cambiar username</h2>
              <p className="text-sm text-gray-600 mb-4">
                ⚠️ Solo puedes cambiar tu username cada 30 días
              </p>
              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nuevo username
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameData.newUsername}
                    onChange={(e) => setUsernameData({ ...usernameData, newUsername: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar con contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={usernameData.password}
                    onChange={(e) => setUsernameData({ ...usernameData, password: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {errorUsername && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {errorUsername}
                  </div>
                )}
                {successUsername && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {successUsername}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingUsername}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingUsername ? 'Actualizando...' : 'Cambiar username'}
                </button>
              </form>
            </div>

            {/* Eliminar cuenta */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
              <h2 className="text-xl font-semibold text-red-600 mb-4">Zona peligrosa</h2>
              <p className="text-gray-700 mb-4">
                Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, está seguro.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ¿Estás absolutamente seguro?
            </h3>
            <p className="text-gray-600 mb-4">
              Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta y todos tus datos.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirma tu contraseña para continuar
              </label>
              <input
                type="password"
                value={deleteData.password}
                onChange={(e) => setDeleteData({ password: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Tu contraseña"
              />
            </div>

            {errorDelete && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {errorDelete}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteData({ password: '' });
                  setErrorDelete('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                disabled={loadingDelete}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loadingDelete || !deleteData.password}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loadingDelete ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;