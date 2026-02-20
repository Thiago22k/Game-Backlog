// Formatear fecha de timestamp a texto legible
export const formatReleaseDate = (timestamp) => {
  if (!timestamp) return 'Fecha desconocida';

  const date = new Date(timestamp * 1000); // IGDB usa Unix timestamp
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('es-ES', options);
};

// Formatear URL de imagen de IGDB
export const formatIGDBImage = (url, size = 't_1080p') => {
  if (!url) return null;

  // Reemplazar tamaño
  const formattedUrl = url.replace(/t_\w+/, size);

  // Agregar https
  return formattedUrl.startsWith('//') ? `https:${formattedUrl}` : formattedUrl;
};

export const getGameBanner = (game) => {
  if (!game) return null;

  // Prioridad 1: Screenshot Aleatorio
  if (game.screenshots && game.screenshots.length > 0) {
    const randomIndex = Math.floor(Math.random() * game.screenshots.length);
    return formatIGDBImage(game.screenshots[randomIndex].url, 't_screenshot_huge');
  }

  // Prioridad 2: Artwork Aleatorio
  if (game.artworks && game.artworks.length > 0) {
    const randomIndex = Math.floor(Math.random() * game.artworks.length);
    return formatIGDBImage(game.artworks[randomIndex].url, 't_1080p');
  }

  // Prioridad 3: Cover
  if (game.cover) {
    return formatIGDBImage(game.cover.url, 't_1080p');
  }

  return null;
};

// Obtener cover del juego
export const getGameCover = (game) => {
  if (!game.cover) return 'https://via.placeholder.com/264x374?text=No+Cover';
  return formatIGDBImage(game.cover.url, 't_cover_big');
};