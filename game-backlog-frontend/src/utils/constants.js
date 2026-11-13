// URL del backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL || 'http://localhost:3000';

// Endpoints
export const ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
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
    RECOMMENDATIONS: '/games/recommendations', // ← Nuevo
    GAME_STATS: (id) => `/games/stats/${id}`,
    GAME_STAT_USERS: (id, stat) => `/games/stats/${id}/${stat}/users`,
  },
  SETTINGS: {
    CHANGE_PASSWORD: '/settings/change-password',
    UPDATE_EMAIL: '/settings/update-email',
    UPDATE_USERNAME: '/settings/update-username',
    UPDATE_PROFILE_VISIBILITY: '/settings/update-profile-visibility',
    UPDATE_PROFILE: '/settings/update-profile',
    DELETE_ACCOUNT: '/settings/delete-account',
  },
  REVIEWS: {
    POPULAR: '/reviews/popular',
    RECENT: '/reviews/recent',
    BY_GAME: (id) => `/reviews/game/${id}`,
    MY_REVIEW: (id) => `/reviews/game/${id}/me`,
    SAVE: (id) => `/reviews/game/${id}`,
    DELETE: (id) => `/reviews/game/${id}`,
    TOGGLE_LIKE: (id) => `/reviews/${id}/like`,
    ADD_COMMENT: (id) => `/reviews/${id}/comments`,
    GET_COMMENTS: (id) => `/reviews/${id}/comments`,
    DELETE_COMMENT: (reviewId, commentId) => `/reviews/${reviewId}/comments/${commentId}`,
    REPORT: (id) => `/reviews/${id}/report`,
    GET_REVIEW: (id) => `/reviews/${id}`,
    GET_USER_REVIEWS: (username) => `/reviews/user/${username}`,
  },
  COLLECTIONS: {
    GAME_COLLECTIONS: (id) => `/collections/game/${id}`,
  },
  STEAM: {
    LINK: '/steam/link',
    STATUS: '/steam/status',
    UNLINK: '/steam/unlink',
  }
};



// Subestados de reseñas
export const REVIEW_SUB_STATUSES = {
  completed: [
    { value: 'platinum', label: 'Platinum' },
    { value: 'main_story', label: 'Main Story' },
    { value: 'replayed', label: 'Replayed' },
    { value: 'one_and_done', label: 'One and Done' },
  ],
  playing: [
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'sporadic', label: 'Sporadic Player' },
    { value: 'stuck', label: 'Stuck' },
  ],
  backlog: [
    { value: 'next_to_play', label: 'Next to Play' },
    { value: 'low_priority', label: 'Low Priority' },
    { value: 'waiting_for_friends', label: 'Waiting for Friends' },
  ],
  dropped: [
    { value: 'boring', label: 'Boring' },
    { value: 'too_hard', label: 'Too Hard' },
    { value: 'unplayable', label: 'Unplayable / Buggy' },
    { value: 'false_expectations', label: 'False Expectations' },
  ]
};