/**
 * Sanitiza un handle de red social para permitir solo caracteres seguros.
 * Permite: alfanuméricos, guiones, guiones bajos y puntos.
 * @param {string} handle - El handle a sanitizar.
 * @returns {string|null} - El handle sanitizado o null si está vacío.
 */

export const SOCIAL_LIMITS = {
    twitch: 25,
    discord: 32,
    steam: 32,
};

export const sanitizeSocialHandle = (value, maxLength = 32) => {
    if (!value || typeof value !== 'string') return '';

    let cleaned = value.trim();

    // Si pegan una URL completa (ej. https://www.twitch.tv/usuario/), quedarse solo con el último segmento
    cleaned = cleaned
        .replace(/^https?:\/\/(www\.)?(twitch\.tv|discord\.com\/users|steamcommunity\.com\/(id|profiles))\//i, '')
        .replace(/\/+$/, '');

    // Quitar @ inicial y espacios/caracteres de control
    cleaned = cleaned.replace(/^@+/, '').replace(/[^a-zA-Z0-9_.-]/g, '');

    return cleaned.slice(0, maxLength);
};

/**
 * Sanitiza la biografía del usuario.
 * @param {string} bio - La biografía a sanitizar.
 * @returns {string|null} - Biografía limpia.
 */
export const sanitizeBio = (bio) => {
    if (!bio) return null;
    // eslint-disable-next-line no-control-regex
    return bio.trim().replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '');
};
