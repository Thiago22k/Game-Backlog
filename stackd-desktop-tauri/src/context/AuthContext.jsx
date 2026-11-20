import { createContext, useState, useEffect, useContext } from 'react';
import axios, { setDesktopToken } from '../api/axios';
import { ENDPOINTS } from '../utils/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    let cancelled = false;

    const initAuth = async (attempt = 0) => {
      try {
        const response = await axios.get(ENDPOINTS.AUTH.ME);
        if (!cancelled) {
          setUser(response.data.user);
          setIsLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          setDesktopToken(null);
          setUser(null);
          setIsLoading(false);
        } else if (attempt < 5) {
          // El backend local aún está arrancando; reintentar en 600ms sin borrar el token
          setTimeout(() => initAuth(attempt + 1), 600);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(ENDPOINTS.AUTH.REGISTER, {
        username,
        email,
        password,
      });

      if (response.data?.token) setDesktopToken(response.data.token);
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

      if (response.data?.token) setDesktopToken(response.data.token);
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

      if (response.data?.token) setDesktopToken(response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión',
      };
    }
  };

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
      setDesktopToken(null);
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