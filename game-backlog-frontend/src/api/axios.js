import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

// Crear instancia de axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de REQUEST: Agregar token automáticamente
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de RESPONSE: Manejar errores globalmente
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir a login si:
    // 1. Es un error 401
    // 2. NO es una petición a /auth/login (evitar loop)
    // 3. NO es una petición a /settings/* (son errores esperados de validación)
    // 4. Hay un token guardado (significa que expiró)
    if (
      error.response?.status === 401 && 
      !error.config.url.includes('/auth/login') &&
      !error.config.url.includes('/settings') && // ← Nueva condición
      localStorage.getItem(STORAGE_KEYS.TOKEN)
    ) {
      // Limpiar token
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      
      // Solo redirigir si NO estamos ya en login/register
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;