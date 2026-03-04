const axios = require('axios');
const IgdbCache = require('../models/igdb_cache.model');

let accessToken = null;
let tokenExpiration = null;

// Cache en memoria para listas (Popular, Recent, etc)
const memoryCache = {
  // Ej: { 'popular_10': { data: [...], expiresAt: 123456789 } }
};

const getFromMemoryCache = (key) => {
  const cached = memoryCache[key];
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`🧠 Memory Cache Hit: ${key}`);
    return cached.data;
  }
  return null;
};

const setToMemoryCache = (key, data, ttlHours = 24) => {
  memoryCache[key] = {
    data,
    expiresAt: Date.now() + (ttlHours * 60 * 60 * 1000)
  };
};

// Helper para determinar si el cache es válido según el TTL escalonado
const isCacheValid = (cachedAt, firstReleaseDate) => {
  if (!cachedAt) return false;

  const now = Date.now();
  const ageInDays = (now - new Date(cachedAt).getTime()) / (1000 * 60 * 60 * 24);

  // Si no hay fecha de lanzamiento, asumimos que es "nuevo/fresco" por seguridad
  if (!firstReleaseDate) return ageInDays < 7;

  // Fecha de hace 6 meses (180 días) en timestamp Unix (segundos)
  const sixMonthsAgo = Math.floor((now - (180 * 24 * 60 * 60 * 1000)) / 1000);

  // Si fue lanzado hace menos de 6 meses -> TTL de 7 días
  if (firstReleaseDate > sixMonthsAgo) {
    return ageInDays < 7;
  }

  // Si es un juego antiguo -> TTL de 30 días
  return ageInDays < 30;
};

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

    // Mitigate APIScript injection by escaping double quotes and limiting length
    const sanitizedQuery = typeof query === 'string'
      ? query.replace(/"/g, '\\"').substring(0, 100)
      : '';

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, cover.image_id, summary, first_release_date, rating, platforms.name, genres.name, game_type, version_parent, parent_game;
        search "${sanitizedQuery}";
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
    // 1. Intentar buscar en el cache persistente
    const isNumeric = !isNaN(slugOrId);
    let cachedGame = null;

    if (isNumeric) {
      cachedGame = await IgdbCache.getById(parseInt(slugOrId));
    } else {
      cachedGame = await IgdbCache.getBySlug(slugOrId);
    }

    // 2. Si existe en cache, verificar si sigue siendo válido (TTL)
    // También verificamos si tiene campos esenciales (como summary). 
    // Si le faltan, forzamos un refresh aunque el TTL sea válido (para arreglar cache "envenenado").
    if (cachedGame && isCacheValid(cachedGame.updated_at, cachedGame.data.first_release_date)) {
      const hasEssentialData = cachedGame.data &&
        (cachedGame.data.summary || cachedGame.data.storyline) &&
        (!cachedGame.data.similar_games ||
          (cachedGame.data.similar_games.length === 0) ||
          (cachedGame.data.similar_games[0].name)) &&
        // Force refresh if new detail fields are missing (added in v2)
        ('websites' in cachedGame.data || 'game_modes' in cachedGame.data) &&
        // Force refresh if websites lack category or type
        (!cachedGame.data.websites?.length || (cachedGame.data.websites[0].category !== undefined || cachedGame.data.websites[0].type !== undefined)) &&
        // Force refresh if age_ratings exist but rating_category is not an expanded object
        (!cachedGame.data.age_ratings?.length || typeof cachedGame.data.age_ratings[0].rating_category === 'object') &&
        // Force refresh if time_to_beat key is absent entirely (added in v3; null means game has no data, which is valid)
        'time_to_beat' in cachedGame.data;

      if (hasEssentialData) {
        console.log(`📦 Cache Hit²: ${slugOrId}`);
        return cachedGame.data;
      }
      console.log(`🌐 Cache Incomplete (Repairing): ${slugOrId}`);
    } else {
      console.log(`🌐 Cache Miss/Expired: ${slugOrId}`);
    }

    // 3. Si no hay cache o expiró, consultar IGDB
    const token = await getAccessToken();
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
          similar_games.cover.image_id,
          similar_games.rating,
          involved_companies.company.name,
          involved_companies.developer,
          involved_companies.publisher,
          game_type,
          parent_game.name,
          parent_game.slug,
          parent_game.first_release_date,
          version_parent.name,
          version_parent.slug,
          version_parent.first_release_date,
          game_modes.name,
          player_perspectives.name,
          age_ratings.organization,
          age_ratings.rating_category.rating,
          language_supports.language.name,
          language_supports.language_support_type.name,
          websites.url,
          websites.category,
          websites.type,
          websites.trusted;
        where ${whereClause};
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const gameData = response.data[0];

    // 4. Si encontramos el juego, enriquecer con time_to_beat (endpoint separado)
    if (gameData) {
      const ttb = await getTimeToBeat(gameData.id, token);
      gameData.time_to_beat = ttb; // null si no hay datos
      await IgdbCache.upsert(gameData.id, gameData.slug, gameData.name, gameData);
    }

    return gameData;

  } catch (error) {
    console.error('❌ Error obteniendo juego de IGDB:', error.message);
    throw new Error('Error al obtener detalles del juego');
  }
};

// Obtener datos de tiempo de juego desde el endpoint separado de IGDB
const getTimeToBeat = async (igdbGameId, token) => {
  try {
    const t = token || (await getAccessToken());
    const response = await axios.post(
      'https://api.igdb.com/v4/game_time_to_beats',
      `fields game_id, hastily, normally, completely; where game_id = ${igdbGameId}; limit 1;`,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${t}`,
        },
      }
    );
    return response.data[0] || null;
  } catch (err) {
    console.warn(`⚠️ Could not fetch time_to_beat for game ${igdbGameId}:`, err.message);
    return null;
  }
};

// Obtener juegos populares ACTUALES (últimos 3 años + alta calificación + más jugados)
const getPopularGames = async (limit = 10) => {
  const cacheKey = `popular_${limit}`;
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    const token = await getAccessToken();

    // Fecha de hace 3 años en timestamp Unix
    const threeYearsAgo = Math.floor((Date.now() - (3 * 365 * 24 * 60 * 60 * 1000)) / 1000);
    const gracePeriod = 24 * 60 * 60; // 24 horas en segundos
    const nowWithGrace = Math.floor(Date.now() / 1000) - gracePeriod;

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, cover.image_id, rating, first_release_date, total_rating_count, game_type, version_parent, parent_game;
        where 
          first_release_date > ${threeYearsAgo} 
          & first_release_date < ${nowWithGrace}
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

    setToMemoryCache(cacheKey, response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo juegos populares:', error.message);
    throw new Error('Error al obtener juegos populares');
  }
};

// Obtener lanzamientos recientes (últimos 3 meses, SOLO ya lanzados)
const getRecentGames = async (limit = 10) => {
  const cacheKey = `recent_${limit}`;
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    const token = await getAccessToken();

    // Últimos 3 meses
    const threeMonthsAgo = Math.floor((Date.now() - (3 * 30 * 24 * 60 * 60 * 1000)) / 1000);
    // HOY (considerando periodo de gracia de 24h)
    const gracePeriod = 24 * 60 * 60;
    const nowWithGrace = Math.floor(Date.now() / 1000) - gracePeriod;

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, cover.image_id, rating, first_release_date, game_type, version_parent, parent_game;
        where 
          first_release_date > ${threeMonthsAgo} 
          & first_release_date <= ${nowWithGrace}
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

    setToMemoryCache(cacheKey, response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo juegos recientes:', error.message);
    throw new Error('Error al obtener juegos recientes');
  }
};

// Obtener juegos más esperados (próximos lanzamientos con más hype)
const getMostAnticipated = async (limit = 10) => {
  const cacheKey = `anticipated_${limit}`;
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    const token = await getAccessToken();

    const gracePeriod = 24 * 60 * 60; // 24 horas en segundos
    const nowWithGrace = Math.floor(Date.now() / 1000) - gracePeriod;
    // Próximos 12 meses
    const oneYearFromNow = Math.floor((Date.now() + (365 * 24 * 60 * 60 * 1000)) / 1000);

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, cover.image_id, genres.name, artworks.url, screenshots.url, rating, first_release_date, hypes, game_type, version_parent, parent_game;
        where 
          first_release_date > ${nowWithGrace}
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

    setToMemoryCache(cacheKey, response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo juegos más esperados:', error.message);
    throw new Error('Error al obtener juegos más esperados');
  }
};

/// Explorar juegos con filtros y ordenamiento
const exploreGames = async (filters = {}) => {
  const cacheKey = `explore_${JSON.stringify(filters)}`;
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    const token = await getAccessToken();

    const {
      sort = 'relevance',
      timeRange = null, // 'last_month', 'last_year', 'last_5_years', 'upcoming'
      genres = [],
      platforms = [],
      gameTypes = [],
      limit = 20,
      offset = 0
    } = filters;

    // Construir condiciones WHERE
    const conditions = [];

    // Siempre tener cover
    conditions.push('cover != null');

    // Filtro por rango de tiempo
    const gracePeriod = 24 * 60 * 60; // 24h de gracia
    const nowWithGrace = Math.floor(Date.now() / 1000) - gracePeriod;

    if (timeRange === 'last_month') {
      const lastMonth = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000);
      conditions.push(`first_release_date >= ${lastMonth} & first_release_date <= ${nowWithGrace}`);
    } else if (timeRange === 'this_year') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
      conditions.push(`first_release_date >= ${startOfYear} & first_release_date <= ${nowWithGrace}`);
    } else if (timeRange === 'last_year') {
      const lastYearStart = new Date(new Date().getFullYear() - 1, 0, 1).getTime() / 1000;
      const lastYearEnd = new Date(new Date().getFullYear() - 1, 11, 31).getTime() / 1000;
      conditions.push(`first_release_date >= ${lastYearStart} & first_release_date <= ${lastYearEnd}`);
    } else if (timeRange === 'last_5_years') {
      const last5Years = Math.floor((Date.now() - (5 * 365 * 24 * 60 * 60 * 1000)) / 1000);
      conditions.push(`first_release_date >= ${last5Years} & first_release_date <= ${nowWithGrace}`);
    } else {
      // Por defecto: solo juegos ya lanzados (con gracia de 24h)
      conditions.push(`first_release_date <= ${nowWithGrace}`);
    }

    // Filtro por géneros
    if (genres.length > 0) {
      conditions.push(`genres = (${genres.join(',')})`);
    }

    // Filtro por plataformas
    if (platforms.length > 0) {
      conditions.push(`platforms = (${platforms.join(',')})`);
    }

    // Filtro por tipos de juego (Main game, DLC, Remake, etc)
    if (gameTypes.length > 0) {
      conditions.push(`game_type = (${gameTypes.join(',')})`);
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
    fields name, slug, cover.url, cover.image_id, rating, first_release_date, genres.name, platforms.name, aggregated_rating, artworks.url, screenshots.url, game_type, version_parent, parent_game;
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

    setToMemoryCache(cacheKey, response.data, 12); // Menos TTL para exploración (12h)
    return response.data;

  } catch (error) {
    console.error('❌ Error explorando juegos:', error.message);
    throw new Error('Error al explorar juegos');
  }
};

// Obtener lista de géneros disponibles
const getGenres = async () => {
  const cacheKey = 'genres_list';
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

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

    setToMemoryCache(cacheKey, response.data, 168); // 7 días para géneros
    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo géneros:', error.message);
    throw new Error('Error al obtener géneros');
  }
};

// Obtener plataformas principales
const getPlatforms = async () => {
  const cacheKey = 'platforms_list';
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

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

    setToMemoryCache(cacheKey, response.data, 168); // 7 días para plataformas
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo plataformas:', error.message);
    throw new Error('Error al obtener plataformas');
  }
};

// Obtener múltiples juegos por IDs (batch) con lógica híbrida
const getGamesByIds = async (gameIds) => {
  try {
    if (!gameIds || gameIds.length === 0) return [];

    // 1. Buscar lo que ya tenemos en cache
    const cachedGames = await IgdbCache.getManyByIds(gameIds);

    // Filtrar los que son válidos según su TTL y que NO sean registros parciales (deben tener summary o storyline)
    const validCachedGames = cachedGames.filter(g =>
      isCacheValid(g.updated_at, g.data.first_release_date) &&
      (g.data.summary || g.data.storyline)
    );

    const validIds = new Set(validCachedGames.map(g => g.igdb_id));
    const missingIds = gameIds.filter(id => !validIds.has(id));

    // Si todo está en cache, devolverlo
    if (missingIds.length === 0) {
      console.log(`📦 Batch Cache Hit: All ${gameIds.length} games`);
      return validCachedGames.map(g => g.data);
    }

    console.log(`🌐 Batch Hybrid: ${validCachedGames.length} hits, ${missingIds.length} misses`);

    // 2. Pedir los faltantes a IGDB
    const token = await getAccessToken();

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, cover.image_id, summary, storyline, first_release_date, 
               rating, rating_count, genres.id, genres.name, platforms.name, platforms.slug, 
               artworks.url, artworks.image_id, screenshots.url, 
               involved_companies.company.name, involved_companies.developer, involved_companies.publisher, 
               game_type, 
               similar_games.id, similar_games.name, similar_games.slug, 
               similar_games.cover.url, similar_games.cover.image_id, similar_games.rating;
        where id = (${missingIds.join(',')});
        limit 500;
      `,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const newGamesData = response.data;

    // 3. Guardar los nuevos en el cache de forma asíncrona (no bloqueante)
    if (newGamesData.length > 0) {
      Promise.all(newGamesData.map(g =>
        IgdbCache.upsert(g.id, g.slug, g.name, g)
      )).catch(err => console.error('❌ Error actualizando cache batch:', err));
    }

    // 4. Combinar resultados
    const results = [
      ...validCachedGames.map(g => g.data),
      ...newGamesData
    ];

    return results;

  } catch (error) {
    console.error('❌ Error obteniendo juegos por IDs:', error.message);
    return []; // Devolver array vacío en caso de error
  }
};

// Obtener candidatos para recomendaciones (datos básicos)
const getRecommendationsCandidates = async (options = {}) => {
  const cacheKey = `rec_cand_${JSON.stringify(options)}`;
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    const { genreIds = [], gameIds = [], limit = 10 } = options;
    const token = await getAccessToken();

    let whereClause = 'cover != null';
    if (genreIds.length > 0) {
      whereClause += ` & genres = (${genreIds.join(',')}) & rating > 70 & rating_count > 10`;
    } else if (gameIds.length > 0) {
      whereClause += ` & id = (${gameIds.join(',')})`;
    } else {
      return [];
    }

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `
        fields name, slug, cover.url, cover.image_id, rating, total_rating_count, first_release_date, genres.name;
        where ${whereClause};
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

    setToMemoryCache(cacheKey, response.data, 24); // Cache recommendations for 24h
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo candidatos de recomendación:', error.message);
    return [];
  }
};

// Obtener datos básicos de un juego (nombre y cover) de forma rápida
const getBasicGameById = async (igdbId) => {
  try {
    const cached = await IgdbCache.getById(igdbId);
    if (cached) return cached.data;

    const token = await getAccessToken();
    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `fields name, slug, cover.image_id; where id = ${igdbId};`,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const gameData = response.data[0];
    if (gameData) {
      await IgdbCache.upsert(gameData.id, gameData.slug, gameData.name, gameData);
    }
    return gameData;
  } catch (error) {
    console.error('❌ Error in getBasicGameById:', error.message);
    return null;
  }
};

module.exports = {
  getGamesByIds,
  searchGames,
  getGameById,
  getPopularGames,
  getRecentGames,
  getMostAnticipated,
  exploreGames,
  getGenres,
  getPlatforms,
  getRecommendationsCandidates,
  getBasicGameById,
  getTimeToBeat,
};