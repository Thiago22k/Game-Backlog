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

    // Use absolute URL from assets base
    const baseUrl = ASSETS_BASE_URL.endsWith('/') ? ASSETS_BASE_URL.slice(0, -1) : ASSETS_BASE_URL;

    // If static version is requested and available
    if (!animated && user.avatar_static_url) {
        return `${baseUrl}${user.avatar_static_url}`;
    }

    // Default to the main avatar_url (which is a GIF if animated, or WebP if static)
    return `${baseUrl}${user.avatar_url}`;
};
