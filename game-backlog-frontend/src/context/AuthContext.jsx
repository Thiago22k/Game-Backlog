import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../api/axios';
import { ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

// Crear el contexto
const AuthContext = createContext(null);

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derivar isAuthenticated del token
  const isAuthenticated = !!token;

  // Verificar token al cargar la app
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

      if (savedToken) {
        setToken(savedToken);

        try {
          // Verificar que el token sea válido
          const response = await axios.get(ENDPOINTS.AUTH.ME);
          setUser(response.data.user);
        } catch (error) {
          console.error('Token inválido:', error);
          // Si el token no es válido, limpiarlo
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          setToken(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Escuchar cambios en localStorage (para sincronizar entre pestañas)
  useEffect(() => {
    const handleStorageChange = async (event) => {
      // Si el cambio fue en nuestro token de sesión
      if (event.key === STORAGE_KEYS.TOKEN) {
        // Otra pestaña cerró la sesión (borró el token)
        if (event.newValue === null) {
          setToken(null);
          setUser(null);
        }
        // Otra pestaña inició sesión (hay un nuevo token)
        else if (event.newValue !== null) {
          setToken(event.newValue);
          try {
            // Validar silenciosamente el nuevo token para recuperar el usuario
            const response = await axios.get(ENDPOINTS.AUTH.ME, {
              headers: { Authorization: `Bearer ${event.newValue}` }
            });
            setUser(response.data.user);
          } catch (error) {
            console.error('Error sincronizando nueva sesión:', error);
            // Si el token es inválido, forzamos cierre de nuevo
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            setToken(null);
            setUser(null);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Función de registro
  const register = async (username, email, password) => {
    try {
      const response = await axios.post(ENDPOINTS.AUTH.REGISTER, {
        username,
        email,
        password,
      });

      const { user, token } = response.data;

      // Guardar token en localStorage
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      // Actualizar estado
      setToken(token);
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

      const { user, token } = response.data;

      // Guardar token en localStorage
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      // Actualizar estado
      setToken(token);
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
  const logout = () => {
    // Limpiar localStorage
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    // Limpiar estado
    setToken(null);
    setUser(null);
  };

  // Función para actualizar datos del usuario
  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  // Valor del contexto
  const value = {
    user,
    token,
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