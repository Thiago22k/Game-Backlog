import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';

// Crear el contexto
const AuthContext = createContext(null);

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derivar isAuthenticated del user
  const isAuthenticated = !!user;

  // Verificar sesión al cargar la app
  useEffect(() => {
    const initAuth = async () => {
      try {
        // El token viaja automáticamente en la cookie gracias a withCredentials
        const response = await axios.get(ENDPOINTS.AUTH.ME);
        setUser(response.data.user);
      } catch (error) {
        // No hay sesión activa o el token expiró
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Función de registro
  const register = async (username, email, password) => {
    try {
      const response = await axios.post(ENDPOINTS.AUTH.REGISTER, {
        username,
        email,
        password,
      });

      const { user } = response.data;

      // Actualizar estado
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al registrar usuario',
      };
    }
  };

  // Función de login
  const login = async (identifier, password) => {
    try {
      const response = await axios.post(ENDPOINTS.AUTH.LOGIN, {
        identifier,
        password,
      });

      const { user } = response.data;

      // Actualizar estado
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión',
      };
    }
  };

  // Función de logout
  const logout = async () => {
    try {
      await axios.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor', error);
    } finally {
      // Limpiar estado
      setUser(null);
    }
  };

  // Función para actualizar datos del usuario
  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  // Valor del contexto
  const value = {
    user,
    isAuthenticated,
    isLoading,
    register,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};