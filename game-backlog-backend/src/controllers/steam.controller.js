const SteamAccount = require('../models/steam.model');
const User = require('../models/user.model');
const steamService = require('../services/steam.service');

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const redirectToSettings = (res, result) =>
  res.redirect(`${frontendUrl()}/settings?steam=${encodeURIComponent(result)}`);

const publicAccount = (account) => ({
  linked: true,
  steam_id64: account.steam_id64,
  persona_name: account.persona_name,
  avatar_url: account.avatar_url,
  profile_url: account.profile_url,
  library_visible: account.library_visible,
  auto_sync: account.auto_sync,
  last_sync_at: account.last_sync_at,
  last_sync_status: account.last_sync_status,
  linked_at: account.linked_at,
});

// POST /api/steam/link  (autenticado)
// Devuelve la URL de Steam; el frontend navega a ella. Se hace por POST + JSON
// para que funcione igual con cookie (web) y con Bearer (desktop).
const startLink = async (req, res) => {
  try {
    const existing = await SteamAccount.findByUserId(req.user.userId);
    if (existing) {
      return res.status(409).json({ error: 'Tu cuenta ya tiene una cuenta de Steam vinculada' });
    }

    const state = steamService.signState({ userId: req.user.userId, action: 'link' });
    res.json({ url: steamService.buildAuthUrl(state) });
  } catch (error) {
    console.error('Error en startLink:', error);
    res.status(500).json({ error: 'No se pudo iniciar la vinculación con Steam' });
  }
};

// GET /api/steam/callback  (pública: llega desde Steam vía el navegador)
// La identidad del usuario sale del `state` firmado, no de la cookie.
const callback = async (req, res) => {
  try {
    let state;
    try {
      state = steamService.verifyState(String(req.query.state || ''));
    } catch {
      return redirectToSettings(res, 'invalid_state');
    }

    if (req.query['openid.mode'] === 'cancel') {
      return redirectToSettings(res, 'cancelled');
    }

    let steamId;
    try {
      steamId = await steamService.verifyAssertion(req.query);
    } catch (err) {
      console.warn('⚠️ Verificación OpenID de Steam falló:', err.message);
      return redirectToSettings(res, 'verification_failed');
    }

    if (state.action !== 'link') {
      return redirectToSettings(res, 'invalid_state');
    }

    const user = await User.findById(state.userId);
    if (!user || user.status === 'banned') {
      return redirectToSettings(res, 'invalid_state');
    }

    if (await SteamAccount.findByUserId(user.id)) {
      return redirectToSettings(res, 'already_has_account');
    }

    const owner = await SteamAccount.findBySteamId(steamId);
    if (owner) {
      return redirectToSettings(res, owner.user_id === user.id ? 'already_has_account' : 'already_linked');
    }

    const profile = (await steamService.getPlayerSummary(steamId)) || {};

    try {
      await SteamAccount.create(user.id, steamId, profile);
    } catch (err) {
      if (err.code === '23505') return redirectToSettings(res, 'already_linked');
      throw err;
    }

    return redirectToSettings(res, 'linked');
  } catch (error) {
    console.error('Error en callback de Steam:', error);
    return redirectToSettings(res, 'error');
  }
};

// GET /api/steam/status  (autenticado)
const getStatus = async (req, res) => {
  try {
    const account = await SteamAccount.findByUserId(req.user.userId);
    if (!account) return res.json({ linked: false });
    res.json(publicAccount(account));
  } catch (error) {
    console.error('Error en getStatus de Steam:', error);
    res.status(500).json({ error: 'Error al obtener el estado de Steam' });
  }
};

// DELETE /api/steam/unlink  (autenticado)
const unlink = async (req, res) => {
  try {
    const user = await User.findByIdWithPassword(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Protección para la fase 2: una cuenta creada solo con Steam no puede
    // quedarse sin ningún método de acceso.
    if (!user.password) {
      return res.status(400).json({
        error: 'Define una contraseña antes de desvincular Steam, o perderías el acceso a tu cuenta'
      });
    }

    const removed = await SteamAccount.unlink(req.user.userId);
    if (!removed) return res.status(404).json({ error: 'No tienes una cuenta de Steam vinculada' });

    res.json({ message: 'Cuenta de Steam desvinculada' });
  } catch (error) {
    console.error('Error en unlink de Steam:', error);
    res.status(500).json({ error: 'Error al desvincular Steam' });
  }
};

module.exports = { startLink, callback, getStatus, unlink };
