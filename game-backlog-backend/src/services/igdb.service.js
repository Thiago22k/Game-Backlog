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
        fields name, cover.url, summary, first_release_date, rating, platforms.name, genres.name, storyline, screenshots.url;
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

module.exports = {
  searchGames,
  getGameById,
};