const axios = require('axios');
const jwt = require('jsonwebtoken');

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
const CLAIMED_ID_REGEX = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
const STATE_TTL = '10m';
const NONCE_MAX_AGE_MS = 5 * 60 * 1000;

const getBackendUrl = () =>
  (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');

const getCallbackBase = () => `${getBackendUrl()}/api/steam/callback`;

// IMPORTANTE: el `state` NO se firma con JWT_SECRET a secas. El middleware de auth
// acepta cualquier JWT firmado con JWT_SECRET que traiga `userId`, así que un state
// firmado igual (y filtrado en una URL) serviría como token de sesión.
const stateSecret = () => `${process.env.JWT_SECRET}:steam-openid-state`;

const signState = (payload) =>
  jwt.sign({ ...payload, purpose: 'steam_openid' }, stateSecret(), { expiresIn: STATE_TTL });

const verifyState = (token) => {
  const decoded = jwt.verify(token, stateSecret());
  if (decoded.purpose !== 'steam_openid') throw new Error('Invalid state purpose');
  return decoded;
};

// URL a la que se manda al usuario para autenticarse en Steam.
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

// Valida la respuesta de Steam y devuelve el SteamID64.
// Nunca confía en los parámetros de la URL por sí solos: la prueba real es que
// Steam responda `is_valid:true` a check_authentication.
const verifyAssertion = async (query) => {
  if (query['openid.ns'] !== OPENID_NS) throw new Error('OpenID: namespace inválido');
  if (query['openid.mode'] !== 'id_res') throw new Error('OpenID: modo inválido');
  if (query['openid.op_endpoint'] !== STEAM_OPENID_URL) throw new Error('OpenID: op_endpoint inválido');

  // El return_to firmado por Steam debe ser nuestro callback y con el mismo state.
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

  // Los campos que Steam debió firmar deben incluir los críticos.
  const signed = String(query['openid.signed'] || '').split(',');
  for (const field of ['op_endpoint', 'claimed_id', 'identity', 'return_to', 'response_nonce', 'assoc_handle']) {
    if (!signed.includes(field)) throw new Error(`OpenID: el campo ${field} no está firmado`);
  }

  // Frescura del nonce (evita reutilizar una aserción vieja).
  const nonceTime = Date.parse(String(query['openid.response_nonce'] || '').slice(0, 20));
  if (Number.isNaN(nonceTime) || Math.abs(Date.now() - nonceTime) > NONCE_MAX_AGE_MS) {
    throw new Error('OpenID: nonce expirado');
  }

  const match = CLAIMED_ID_REGEX.exec(String(query['openid.claimed_id'] || ''));
  if (!match) throw new Error('OpenID: claimed_id inválido');
  const steamId = match[1];

  // Verificación directa con Steam.
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

// Perfil público (nombre, avatar, URL). Es "best effort": si falla o no hay
// STEAM_API_KEY, la vinculación igual se completa.
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

module.exports = {
  STEAM_OPENID_URL,
  signState,
  verifyState,
  buildAuthUrl,
  verifyAssertion,
  getPlayerSummary,
};
