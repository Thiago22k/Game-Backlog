import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const TOKEN_KEY = 'stackd_desktop_token';

export const getDesktopToken = () => localStorage.getItem(TOKEN_KEY);

export const setDesktopToken = (token) => {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token.trim());
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
};

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
    },
});

axiosInstance.interceptors.request.use((config) => {
    const token = getDesktopToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
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
            if (
                !window.location.pathname.includes('/login') &&
                !window.location.pathname.includes('/register')
            ) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;