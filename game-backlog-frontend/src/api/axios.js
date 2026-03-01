import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Crear instancia de axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  }
});



// Interceptor de RESPONSE: Manejar errores globalmente
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir a login si:
    // 1. Es un error 401
    // 2. NO es una petición a /auth/login (evitar loop)
    // 3. NO es una petición a /settings/* (son errores esperados de validación)
    // 4. NO es una petición a /auth/me o /auth/logout
    // 5. NO es una petición a /notifications (polling durante logout generaba redirección)
    // 6. NO es a endpoints de fetching al cargar Landing (/games/user, /games/recommendations) que pueden dispararse durante la transición de logout
    if (
      error.response?.status === 401 &&
      !error.config.url.includes('/auth/login') &&
      !error.config.url.includes('/auth/me') &&
      !error.config.url.includes('/auth/logout') &&
      !error.config.url.includes('/settings') &&
      !error.config.url.includes('/notifications') &&
      !error.config.url.includes('/games/user') &&
      !error.config.url.includes('/games/recommendations')
    ) {

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