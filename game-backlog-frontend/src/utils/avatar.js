import defaultAvatar from '../assets/default_avatar.png';
import { ASSETS_BASE_URL } from './constants';

/**
 * Utility to get the correct avatar URL based on whether an animated version is desired.
 * 
 * @param {Object} user - The user object containing avatar_url and avatar_static_url.
 * @param {Object} options - Options object.
 * @param {boolean} options.animated - Whether to return the animated GIF version if available.
 * @returns {string} The full URL to the avatar.
 */
export const getAvatarUrl = (user, { animated = true } = {}) => {
    if (!user?.avatar_url) return defaultAvatar;

    // Use absolute URL from assets base for old local files, but allow absolute Cloudinary URLs
    const baseUrl = ASSETS_BASE_URL.endsWith('/') ? ASSETS_BASE_URL.slice(0, -1) : ASSETS_BASE_URL;

    // Helper to format the URL correctly
    const formatUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${baseUrl}${url}`;
    };

    // If static version is requested and available
    if (!animated && user.avatar_static_url) {
        return formatUrl(user.avatar_static_url);
    }

    // Default to the main avatar_url (which is a GIF if animated, or WebP if static)
    return formatUrl(user.avatar_url);
};
