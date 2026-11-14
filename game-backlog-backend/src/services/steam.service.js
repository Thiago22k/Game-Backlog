const axios = require('axios');
const jwt = require('jsonwebtoken');

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
const CLAIMED_ID_REGEX = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
const STATE_TTL = '10m';
const SIGNUP_TOKEN_TTL = '15m';
const NONCE_MAX_AGE_MS = 5 * 60 * 1000;

const getBackendUrl = () =>
  (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');

const getCallbackBase = () => `${getBackendUrl()}/api/steam/callback`;

const stateSecret = () => `${process.env.JWT_SECRET}:steam-openid-state`;
const signupSecret = () => `${process.env.JWT_SECRET}:steam-signup-token`;

const signState = (payload) =>
  jwt.sign({ ...payload, purpose: 'steam_openid' }, stateSecret(), { expiresIn: STATE_TTL });

const verifyState = (token) => {
  const decoded = jwt.verify(token, stateSecret());
  if (decoded.purpose !== 'steam_openid') throw new Error('Invalid state purpose');
  return decoded;
};

// Lee los flags `popup` y `action` del state SIN verificar la firma. Solo se usa para decidir
// a cuál de las páginas fijas del frontend redirigir cuando el state ya es inválido o expiró;
// nunca para tomar decisiones de autenticación.
const peekState = (token) => {
  try {
    const decoded = jwt.decode(String(token || ''));
    if (decoded?.purpose !== 'steam_openid') return { popup: false, action: null };
    return {
      popup: decoded.popup === true,
      action: decoded.action === 'login' || decoded.action === 'link' ? decoded.action : null,
    };
  } catch {
    return { popup: false, action: null };
  }
};

const signSignupToken = (payload) =>
  jwt.sign({ ...payload, purpose: 'steam_signup' }, signupSecret(), { expiresIn: SIGNUP_TOKEN_TTL });

const verifySignupToken = (token) => {
  const decoded = jwt.verify(token, signupSecret());
  if (decoded.purpose !== 'steam_signup' || !decoded.steamId) {
    throw new Error('Invalid signup token');
  }
  return decoded;
};

const buildAuthUrl = (state) => {
  const returnTo = `${getCallbackBase()}?state=${encodeURIComponent(state)}`;
  const params = new URLSearchParams({
    'openid.ns': OPENID_NS,
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': getBackendUrl(),
    'openid.identity': IDENTIFIER_SELECT,
    'openid.claimed_id': IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
};

const verifyAssertion = async (query) => {
  if (query['openid.ns'] !== OPENID_NS) throw new Error('OpenID: namespace inválido');
  if (query['openid.mode'] !== 'id_res') throw new Error('OpenID: modo inválido');
  if (query['openid.op_endpoint'] !== STEAM_OPENID_URL) throw new Error('OpenID: op_endpoint inválido');

  let returnTo;
  try {
    returnTo = new URL(query['openid.return_to']);
  } catch {
    throw new Error('OpenID: return_to inválido');
  }
  const expected = new URL(getCallbackBase());
  if (returnTo.origin !== expected.origin || returnTo.pathname !== expected.pathname) {
    throw new Error('OpenID: return_to no coincide');
  }
  if (!query.state || returnTo.searchParams.get('state') !== query.state) {
    throw new Error('OpenID: state no coincide');
  }

  const signed = String(query['openid.signed'] || '').split(',');
  for (const field of ['op_endpoint', 'claimed_id', 'identity', 'return_to', 'response_nonce', 'assoc_handle']) {
    if (!signed.includes(field)) throw new Error(`OpenID: el campo ${field} no está firmado`);
  }

  const nonceTime = Date.parse(String(query['openid.response_nonce'] || '').slice(0, 20));
  if (Number.isNaN(nonceTime) || Math.abs(Date.now() - nonceTime) > NONCE_MAX_AGE_MS) {
    throw new Error('OpenID: nonce expirado');
  }

  const match = CLAIMED_ID_REGEX.exec(String(query['openid.claimed_id'] || ''));
  if (!match) throw new Error('OpenID: claimed_id inválido');
  const steamId = match[1];

  const body = new URLSearchParams();
  Object.keys(query).forEach((key) => {
    if (key.startsWith('openid.')) body.append(key, String(query[key]));
  });
  body.set('openid.mode', 'check_authentication');

  const response = await axios.post(STEAM_OPENID_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });

  if (!/(^|\n)is_valid:true(\n|$)/.test(String(response.data))) {
    throw new Error('OpenID: Steam rechazó la aserción');
  }

  return steamId;
};

const getPlayerSummary = async (steamId) => {
  if (!process.env.STEAM_API_KEY) return null;
  try {
    const response = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', {
      params: { key: process.env.STEAM_API_KEY, steamids: steamId },
      timeout: 10000,
    });
    const player = response.data?.response?.players?.[0];
    if (!player) return null;
    return {
      persona_name: player.personaname || null,
      avatar_url: player.avatarfull || player.avatar || null,
      profile_url: player.profileurl || null,
    };
  } catch (err) {
    console.warn('⚠️ No se pudo obtener el perfil de Steam:', err.message);
    return null;
  }
};

// Obtener biblioteca completa de Steam.
// Cuando los "Detalles de juegos" en Steam son privados, Steam devuelve `{ response: {} }`
// sin `games` ni `game_count`.
const getOwnedGames = async (steamId) => {
  if (!process.env.STEAM_API_KEY) {
    throw new Error('STEAM_API_KEY no está configurada en el servidor');
  }

  const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
    params: {
      key: process.env.STEAM_API_KEY,
      steamid: steamId,
      include_appinfo: 1,
      include_played_free_games: 1,
      format: 'json',
    },
    timeout: 15000,
  });

  const payload = response.data?.response;
  if (!payload || (!Array.isArray(payload.games) && payload.game_count === undefined)) {
    return { isPrivate: true, games: [] };
  }

  const games = (payload.games || []).map((g) => ({
    steam_appid: Number(g.appid),
    name: g.name || `App ${g.appid}`,
    playtime_minutes: Number(g.playtime_forever || 0),
    playtime_2weeks_min: Number(g.playtime_2weeks || 0),
    last_played_at: g.rtime_last_played ? new Date(Number(g.rtime_last_played) * 1000) : null,
    img_icon_url: g.img_icon_url || null,
  }));

  return { isPrivate: false, games };
};

// Obtener juegos jugados en las últimas 2 semanas (respaldo si playtime_2weeks no viene en GetOwnedGames)
const getRecentlyPlayedGames = async (steamId) => {
  if (!process.env.STEAM_API_KEY) return [];
  try {
    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/', {
      params: {
        key: process.env.STEAM_API_KEY,
        steamid: steamId,
        format: 'json',
      },
      timeout: 10000,
    });
    const games = response.data?.response?.games || [];
    return games.map((g) => ({
      steam_appid: Number(g.appid),
      playtime_2weeks_min: Number(g.playtime_2weeks || 0),
    }));
  } catch (err) {
    console.warn('⚠️ No se pudo obtener GetRecentlyPlayedGames:', err.message);
    return [];
  }
};

module.exports = {
  STEAM_OPENID_URL,
  signState,
  verifyState,
  peekState,
  signSignupToken,
  verifySignupToken,
  buildAuthUrl,
  verifyAssertion,
  getPlayerSummary,
  getOwnedGames,
  getRecentlyPlayedGames,
};