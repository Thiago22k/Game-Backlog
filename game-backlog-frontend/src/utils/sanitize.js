/**
 * Sanitiza un handle de red social para permitir solo caracteres seguros.
 * Permite: alfanuméricos, guiones, guiones bajos y puntos.
 * @param {string} handle - El handle a sanitizar.
 * @returns {string|null} - El handle sanitizado o null si está vacío.
 */
export const sanitizeSocialHandle = (handle) => {
    if (!handle) return null;
    // Solo permitir alfanuméricos, guiones, guiones bajos y puntos
    return handle.replace(/[^a-zA-Z0-9_\-\.]/g, '');
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
