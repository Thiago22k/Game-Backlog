import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Crear instancia de axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});



// Interceptor de RESPONSE: Manejar errores globalmente
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir a login si:
    // 1. Es un error 401
    // 2. NO es una petición a /auth/login (evitar loop)
    // 3. NO es una petición a /settings/* (son errores esperados de validación)
    // 4. NO es una petición a /auth/me (evitar que check de initAuth mande a login)
    if (
      error.response?.status === 401 &&
      !error.config.url.includes('/auth/login') &&
      !error.config.url.includes('/auth/me') &&
      !error.config.url.includes('/settings')
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