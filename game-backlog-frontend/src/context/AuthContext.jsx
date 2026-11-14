import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await axios.get(ENDPOINTS.AUTH.ME);
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(ENDPOINTS.AUTH.REGISTER, {
        username,
        email,
        password,
      });

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al registrar usuario',
      };
    }
  };

  const completeSteamSignup = async ({ token, username, email }) => {
    try {
      const response = await axios.post(ENDPOINTS.STEAM.COMPLETE_SIGNUP, {
        token,
        username,
        email: email || undefined,
      });

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al completar el registro con Steam',
      };
    }
  };

  const login = async (identifier, password) => {
    try {
      const response = await axios.post(ENDPOINTS.AUTH.LOGIN, {
        identifier,
        password,
      });

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión',
      };
    }
  };

  // Vuelve a consultar la sesión (p. ej. después de iniciar sesión con Steam en otra ventana)
  const refreshUser = async () => {
    try {
      const response = await axios.get(ENDPOINTS.AUTH.ME);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch {
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await axios.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor', error);
    } finally {
      setUser(null);
    }
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    register,
    completeSteamSignup,
    login,
    refreshUser,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};