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
        fields name, cover.url, summary, first_release_date, rating, platforms.name, genres.name;
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

// Obtener detalles de un juego por ID
const getGameById = async (gameId) => {
  try {
    const token = await getAccessToken();

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields 
          name, 
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
          genres.name, 
          screenshots.url,
          similar_games.name,
          similar_games.cover.url,
          similar_games.rating,
          involved_companies.company.name,
          involved_companies.developer,
          involved_companies.publisher;
        where id = ${gameId};
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
        fields name, cover.url, rating, first_release_date, total_rating_count;
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
        fields name, cover.url, rating, first_release_date;
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
        fields name, cover.url, genres.name, rating, first_release_date, hypes;
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
    } else if (timeRange === 'last_year') {
      const lastYear = Math.floor((Date.now() - (365 * 24 * 60 * 60 * 1000)) / 1000);
      conditions.push(`first_release_date >= ${lastYear} & first_release_date <= ${now}`);
    } else if (timeRange === 'last_5_years') {
      const last5Years = Math.floor((Date.now() - (5 * 365 * 24 * 60 * 60 * 1000)) / 1000);
      conditions.push(`first_release_date >= ${last5Years} & first_release_date <= ${now}`);
    } else if (timeRange === 'upcoming') {
      const nextMonth = Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000);
      conditions.push(`first_release_date > ${now} & first_release_date <= ${nextMonth}`);
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
      case 'rating':
        conditions.push('rating > 80');
        conditions.push('rating_count > 10');
        sortClause = 'sort rating desc';
        break;
      case 'recent':
        sortClause = 'sort first_release_date desc';
        break;
      case 'alphabetical':
        sortClause = 'sort name asc';
        break;
      case 'relevance':
      default:
        // Orden por agregated_rating (mezcla de rating + popularidad)
        // O simplemente por ID descendente para variedad
        sortClause = 'sort aggregated_rating desc';
        break;
    }

    const whereClause = conditions.join(' & ');

    const response = await axios.post(
  'https://api.igdb.com/v4/games',
  `
    fields name, cover.url, rating, first_release_date, genres.name, platforms.name, aggregated_rating, artworks.url, screenshots.url;
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

    // IDs de plataformas principales (curadas manualmente)
    const mainPlatformIds = [
      6,    // PC (Windows)
      14,   // Mac
      3,    // Linux
      167,  // PlayStation 5
      48,   // PlayStation 4
      9,    // PlayStation 3
      169,  // Xbox Series X|S
      49,   // Xbox One
      12,   // Xbox 360
      130,  // Nintendo Switch
      41,   // Wii U
      5,    // Wii
      37,   // Nintendo 3DS
      159,  // Nintendo DS
      34,   // Android
      39,   // iOS
      170,  // Google Stadia
      471,  // Meta Quest 2
      163,  // SteamVR
    ];

    const response = await axios.post(
      'https://api.igdb.com/v4/platforms',
      `
        fields name;
        where id = (${mainPlatformIds.join(',')});
        sort name asc;
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

module.exports = {
  searchGames,
  getGameById,
  getPopularGames,
  getRecentGames,
  getMostAnticipated,
  exploreGames,     // ← Nuevo
  getGenres,        // ← Nuevo
  getPlatforms,     // ← Nuevo
};