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

// Obtener el mejor artwork/banner de un juego
export const getGameBanner = (game) => {
  // Prioridad: artwork > screenshot > cover
  if (game.artworks && game.artworks.length > 0) {
    return formatIGDBImage(game.artworks[0].url, 't_1080p');
  }
  
  if (game.screenshots && game.screenshots.length > 0) {
    return formatIGDBImage(game.screenshots[0].url, 't_screenshot_huge');
  }
  
  // Fallback al cover
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