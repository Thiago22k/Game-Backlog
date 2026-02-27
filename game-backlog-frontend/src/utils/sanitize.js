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
