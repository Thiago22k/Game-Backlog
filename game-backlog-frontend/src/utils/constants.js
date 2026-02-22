// URL del backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Endpoints
export const ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    ME: '/auth/me',
  },
  GAMES: {
    SEARCH: '/games/search',
    USER_GAMES: '/games/user',
    POPULAR: '/games/popular',
    RECENT: '/games/recent',
    ANTICIPATED: '/games/anticipated',
    EXPLORE: '/games/explore',      // ← Nuevo
    GENRES: '/games/genres',        // ← Nuevo
    PLATFORMS: '/games/platforms',  // ← Nuevo
  },
  SETTINGS: {
    CHANGE_PASSWORD: '/settings/change-password',
    UPDATE_EMAIL: '/settings/update-email',
    UPDATE_USERNAME: '/settings/update-username',
    UPDATE_PROFILE_VISIBILITY: '/settings/update-profile-visibility',
    DELETE_ACCOUNT: '/settings/delete-account',
  },
};

// Keys para localStorage
export const STORAGE_KEYS = {
  TOKEN: 'token',
};