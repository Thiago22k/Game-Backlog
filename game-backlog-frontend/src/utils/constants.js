// URL del backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL || 'http://localhost:3000';

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
    EXPLORE: '/games/explore',
    GENRES: '/games/genres',
    PLATFORMS: '/games/platforms',
    GAME_STATS: (id) => `/games/stats/${id}`,
  },
  SETTINGS: {
    CHANGE_PASSWORD: '/settings/change-password',
    UPDATE_EMAIL: '/settings/update-email',
    UPDATE_USERNAME: '/settings/update-username',
    UPDATE_PROFILE_VISIBILITY: '/settings/update-profile-visibility',
    UPDATE_PROFILE: '/settings/update-profile',
    DELETE_ACCOUNT: '/settings/delete-account',
  },
};

// Keys para localStorage
export const STORAGE_KEYS = {
  TOKEN: 'token',
};