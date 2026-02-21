const axios = require('axios');

let accessToken = null;
let tokenExpiration = null;

// Obtener access token de IGDB/Twitch
const getAccessToken = async () => {
  // Si ya tenemos un token válido, reutilizarlo
  if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`
    );

    accessToken = response.data.access_token;
    // El token expira en expires_in segundos (usualmente 60 días)
    tokenExpiration = Date.now() + response.data.expires_in * 1000;

    console.log('✅ Access token de IGDB obtenido');
    return accessToken;

  } catch (error) {
    console.error('❌ Error obteniendo access token de IGDB:', error.message);
    throw new Error('No se pudo autenticar con IGDB');
  }
};

// Buscar juegos en IGDB
const searchGames = async (query, limit = 10) => {
  try {
    const token = await getAccessToken();

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, summary, first_release_date, rating, platforms.name, genres.name;
        search "${query}";
        limit ${limit};
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error buscando juegos en IGDB:', error.message);
    throw new Error('Error al buscar juegos');
  }
};

const getGameById = async (slugOrId) => {
  try {
    const token = await getAccessToken();

    // Comprobar si es numérico (ID) o string (slug)
    const isNumeric = !isNaN(slugOrId);
    const whereClause = isNumeric ? `id = ${slugOrId}` : `slug = "${slugOrId}"`;

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields 
          name, 
          slug,
          cover.url, 
          cover.image_id,
          artworks.url, 
          artworks.image_id,
          summary, 
          storyline, 
          first_release_date, 
          rating, 
          rating_count,
          platforms.name, 
          platforms.slug,
          genres.name, 
          screenshots.url,
          similar_games.name,
          similar_games.slug,
          similar_games.cover.url,
          similar_games.rating,
          involved_companies.company.name,
          involved_companies.developer,
          involved_companies.publisher;
        where ${whereClause};
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data[0];

  } catch (error) {
    console.error('❌ Error obteniendo juego de IGDB:', error.message);
    throw new Error('Error al obtener detalles del juego');
  }
};

// Obtener juegos populares ACTUALES (últimos 3 años + alta calificación + más jugados)
const getPopularGames = async (limit = 10) => {
  try {
    const token = await getAccessToken();

    // Fecha de hace 3 años en timestamp Unix
    const threeYearsAgo = Math.floor((Date.now() - (3 * 365 * 24 * 60 * 60 * 1000)) / 1000);
    const now = Math.floor(Date.now() / 1000);

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, rating, first_release_date, total_rating_count;
        where 
          first_release_date > ${threeYearsAgo} 
          & first_release_date < ${now}
          & cover != null 
          & rating > 75
          & total_rating_count > 50;
        sort total_rating_count desc;
        limit ${limit};
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo juegos populares:', error.message);
    throw new Error('Error al obtener juegos populares');
  }
};

// Obtener lanzamientos recientes (últimos 3 meses, SOLO ya lanzados)
const getRecentGames = async (limit = 10) => {
  try {
    const token = await getAccessToken();

    // Últimos 3 meses
    const threeMonthsAgo = Math.floor((Date.now() - (3 * 30 * 24 * 60 * 60 * 1000)) / 1000);
    // HOY (no futuro)
    const now = Math.floor(Date.now() / 1000);

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, rating, first_release_date;
        where 
          first_release_date > ${threeMonthsAgo} 
          & first_release_date <= ${now}
          & cover != null;
        sort first_release_date desc;
        limit ${limit};
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo juegos recientes:', error.message);
    throw new Error('Error al obtener juegos recientes');
  }
};

// Obtener juegos más esperados (próximos lanzamientos con más hype)
const getMostAnticipated = async (limit = 10) => {
  try {
    const token = await getAccessToken();

    const now = Math.floor(Date.now() / 1000);
    // Próximos 12 meses
    const oneYearFromNow = Math.floor((Date.now() + (365 * 24 * 60 * 60 * 1000)) / 1000);

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, genres.name, artworks.url, screenshots.url, rating, first_release_date, hypes;
        where 
          first_release_date > ${now}
          & first_release_date < ${oneYearFromNow}
          & cover != null
          & hypes > 0;
        sort hypes desc;
        limit ${limit};
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo juegos más esperados:', error.message);
    throw new Error('Error al obtener juegos más esperados');
  }
};

/// Explorar juegos con filtros y ordenamiento
const exploreGames = async (filters = {}) => {
  try {
    const token = await getAccessToken();

    const {
      sort = 'relevance',
      timeRange = null, // 'last_month', 'last_year', 'last_5_years', 'upcoming'
      genres = [],
      platforms = [],
      limit = 20,
      offset = 0
    } = filters;

    // Construir condiciones WHERE
    const conditions = [];

    // Siempre tener cover
    conditions.push('cover != null');

    // Filtro por rango de tiempo
    const now = Math.floor(Date.now() / 1000);

    if (timeRange === 'last_month') {
      const lastMonth = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000);
      conditions.push(`first_release_date >= ${lastMonth} & first_release_date <= ${now}`);
    } else if (timeRange === 'this_year') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
      conditions.push(`first_release_date >= ${startOfYear} & first_release_date <= ${now}`);
    } else if (timeRange === 'last_year') {
      const lastYearStart = new Date(new Date().getFullYear() - 1, 0, 1).getTime() / 1000;
      const lastYearEnd = new Date(new Date().getFullYear() - 1, 11, 31).getTime() / 1000;
      conditions.push(`first_release_date >= ${lastYearStart} & first_release_date <= ${lastYearEnd}`);
    } else if (timeRange === 'last_5_years') {
      const last5Years = Math.floor((Date.now() - (5 * 365 * 24 * 60 * 60 * 1000)) / 1000);
      conditions.push(`first_release_date >= ${last5Years} & first_release_date <= ${now}`);
    } else {
      // Por defecto: solo juegos ya lanzados
      conditions.push(`first_release_date <= ${now}`);
    }

    // Filtro por géneros
    if (genres.length > 0) {
      conditions.push(`genres = (${genres.join(',')})`);
    }

    // Filtro por plataformas
    if (platforms.length > 0) {
      conditions.push(`platforms = (${platforms.join(',')})`);
    }

    // Determinar ordenamiento
    let sortClause = '';
    switch (sort) {
      case 'popular':
        conditions.push('total_rating_count > 10');
        sortClause = 'sort total_rating_count desc';
        break;
      case 'highest_rated': // ← Cambio de nombre
        conditions.push('rating > 70'); // ← Más permisivo
        conditions.push('rating_count > 5'); // ← Más permisivo
        sortClause = 'sort rating desc';
        break;
      case 'recent':
        sortClause = 'sort first_release_date desc';
        break;
      // Eliminar 'alphabetical' y 'upcoming'
      case 'relevance':
      default:
        sortClause = 'sort aggregated_rating desc';
        break;
    }

    const whereClause = conditions.join(' & ');

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
    fields name, slug, cover.url, rating, first_release_date, genres.name, platforms.name, aggregated_rating, artworks.url, screenshots.url;
    where ${whereClause};
    ${sortClause};
    limit ${limit};
    offset ${offset};
  `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error explorando juegos:', error.message);
    throw new Error('Error al explorar juegos');
  }
};

// Obtener lista de géneros disponibles
const getGenres = async () => {
  try {
    const token = await getAccessToken();

    const response = await axios.post(
      'https://api.igdb.com/v4/genres',
      'fields name; limit 50; sort name asc;',
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo géneros:', error.message);
    throw new Error('Error al obtener géneros');
  }
};

// Obtener plataformas principales
const getPlatforms = async () => {
  try {
    const token = await getAccessToken();

    const mainPlatformIds = [
      6, 14, 3, 167, 48, 9, 169, 49, 12, 130, 41, 5, 37, 159, 34, 39, 170, 471, 163,
    ];

    const response = await axios.post(
      'https://api.igdb.com/v4/platforms',
      `
        fields name;
        where id = (${mainPlatformIds.join(',')});
        sort name asc;
        limit 50;  // <--- AGREGA ESTA LÍNEA
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo plataformas:', error.message);
    throw new Error('Error al obtener plataformas');
  }
};

// Obtener múltiples juegos por IDs (batch)
const getGamesByIds = async (gameIds) => {
  try {
    if (gameIds.length === 0) return [];

    const token = await getAccessToken();

    // IGDB permite hasta 500 IDs en una query
    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, rating, first_release_date, genres.name, 
               platforms.name, aggregated_rating, artworks.url, screenshots.url;
        where id = (${gameIds.join(',')});
        limit 500;
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo juegos por IDs:', error.message);
    return []; // Devolver array vacío en caso de error
  }
};

module.exports = {
  getGamesByIds,
  searchGames,
  getGameById,
  getPopularGames,
  getRecentGames,
  getMostAnticipated,
  exploreGames,     // ← Nuevo
  getGenres,        // ← Nuevo
  getPlatforms,     // ← Nuevo
};