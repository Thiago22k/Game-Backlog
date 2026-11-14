const jwt = require('jsonwebtoken');
const SteamAccount = require('../models/steam.model');
const User = require('../models/user.model');
const steamService = require('../services/steam.service');
const { isValidEmail, isValidUsername, sanitizeString, sanitizeUsernameAndPreserveCase } = require('../utils/validation');
const steamSyncService = require('../services/steamSync.service');

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const redirectToSettings = (res, result) =>
  res.redirect(`${frontendUrl()}/settings?steam=${encodeURIComponent(result)}`);
const redirectToLogin = (res, result) =>
  res.redirect(`${frontendUrl()}/login?steam=${encodeURIComponent(result)}`);

// Cuando el login/registro se abre en una ventana emergente, el resultado va a una página
// de confirmación del frontend que avisa a la ventana original y se cierra sola.
const redirectToPopupCallback = (res, params) => {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${frontendUrl()}/auth/steam/callback?${query}`);
};

const issueSessionCookie = (res, user) => {
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });

  return token;
};

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

// GET /api/steam/login  (pública: inicia OpenID para login o registro)
// ?popup=1 indica que se abrió en una ventana emergente (el resultado se entrega vía /auth/steam/callback)
const startLogin = async (req, res) => {
  const popup = req.query.popup === '1';

  try {
    const state = steamService.signState({ action: 'login', popup });
    res.redirect(steamService.buildAuthUrl(state));
  } catch (error) {
    console.error('Error en startLogin:', error);
    if (popup) return redirectToPopupCallback(res, { status: 'error', code: 'error' });
    redirectToLogin(res, 'error');
  }
};

// POST /api/steam/link  (autenticado)
const startLink = async (req, res) => {
  try {
    const existing = await SteamAccount.findByUserId(req.user.userId);
    if (existing) {
      return res.status(409).json({ error: 'Tu cuenta ya tiene una cuenta de Steam vinculada' });
    }

    // popup: true -> el resultado se entrega vía /auth/steam/callback (ventana emergente)
    const popup = req.body?.popup === true;
    const state = steamService.signState({ userId: req.user.userId, action: 'link', popup });
    res.json({ url: steamService.buildAuthUrl(state) });
  } catch (error) {
    console.error('Error en startLink:', error);
    res.status(500).json({ error: 'No se pudo iniciar la vinculación con Steam' });
  }
};

// GET /api/steam/callback  (pública: llega desde Steam vía el navegador)
const callback = async (req, res) => {
  let action = 'link';
  let popup = false;

  // Resultado del flujo de VINCULACIÓN: en popup va a la página de confirmación (flow=link),
  // si no, a Ajustes como siempre.
  const settingsResult = (code) => {
    if (popup) {
      return redirectToPopupCallback(res, {
        flow: 'link',
        status: code === 'linked' ? 'linked' : 'error',
        code,
      });
    }
    return redirectToSettings(res, code);
  };

  const failRedirect = (code) => {
    if (action === 'link') return settingsResult(code);
    if (popup) return redirectToPopupCallback(res, { status: 'error', code });
    return redirectToLogin(res, code);
  };

  try {
    let state;
    try {
      state = steamService.verifyState(String(req.query.state || ''));
      action = state.action || 'link';
      popup = state.popup === true;
    } catch {
      // State inválido/expirado: solo se mira popup/action para elegir la página de destino
      const peeked = steamService.peekState(req.query.state);
      action = peeked.action || 'login';
      popup = peeked.popup;
      return action === 'link' ? settingsResult('invalid_state') : failRedirect('invalid_state');
    }

    if (req.query['openid.mode'] === 'cancel') {
      return failRedirect('cancelled');
    }

    let steamId;
    try {
      steamId = await steamService.verifyAssertion(req.query);
    } catch (err) {
      console.warn('⚠️ Verificación OpenID de Steam falló:', err.message);
      return failRedirect('verification_failed');
    }

    // --- FLUJO 1: LOGIN / REGISTRO CON STEAM ---
    if (action === 'login') {
      const existingAccount = await SteamAccount.findBySteamId(steamId);

      // Si el SteamID ya está vinculado a una cuenta Stackd -> iniciar sesión directo
      if (existingAccount) {
        const user = await User.findById(existingAccount.user_id);
        if (!user) return failRedirect('error');
        if (user.status === 'banned') return failRedirect('banned');

        issueSessionCookie(res, user);
        if (popup) return redirectToPopupCallback(res, { status: 'success' });
        return res.redirect(`${frontendUrl()}/`);
      }

      // Si es nuevo -> obtener datos públicos de Steam y mandar a /register/steam
      const profile = (await steamService.getPlayerSummary(steamId)) || {};
      const signupToken = steamService.signSignupToken({
        steamId,
        persona_name: profile.persona_name || null,
        avatar_url: profile.avatar_url || null,
        profile_url: profile.profile_url || null,
      });

      if (popup) return redirectToPopupCallback(res, { status: 'signup', token: signupToken });
      return res.redirect(`${frontendUrl()}/register/steam?token=${encodeURIComponent(signupToken)}`);
    }

    // --- FLUJO 2: VINCULAR A CUENTA EXISTENTE ---
    if (action !== 'link') {
      return settingsResult('invalid_state');
    }

    const user = await User.findById(state.userId);
    if (!user || user.status === 'banned') {
      return settingsResult('invalid_state');
    }

    if (await SteamAccount.findByUserId(user.id)) {
      return settingsResult('already_has_account');
    }

    const owner = await SteamAccount.findBySteamId(steamId);
    if (owner) {
      return settingsResult(owner.user_id === user.id ? 'already_has_account' : 'already_linked');
    }

    const profile = (await steamService.getPlayerSummary(steamId)) || {};

    try {
      await SteamAccount.create(user.id, steamId, profile);
    } catch (err) {
      if (err.code === '23505') return settingsResult('already_linked');
      throw err;
    }

    return settingsResult('linked');
  } catch (error) {
    console.error('Error en callback de Steam:', error);
    return failRedirect('error');
  }
};

// POST /api/steam/complete-signup  (pública con signupToken)
const completeSignup = async (req, res) => {
  try {
    const { token } = req.body;
    let { username, email } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token de registro de Steam requerido' });
    }

    let steamPayload;
    try {
      steamPayload = steamService.verifySignupToken(String(token));
    } catch {
      return res.status(401).json({ error: 'La sesión de registro con Steam expiró. Vuelve a intentarlo.' });
    }

    username = sanitizeUsernameAndPreserveCase(username);
    email = email ? sanitizeString(email).toLowerCase() : null;

    if (!username || !isValidUsername(username)) {
      return res.status(400).json({
        error: 'Username debe tener entre 3-15 caracteres y solo letras, números y guiones bajos',
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Verificar duplicados antes de crear
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'El username ya está en uso' });
    }

    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
    }

    const existingSteam = await SteamAccount.findBySteamId(steamPayload.steamId);
    if (existingSteam) {
      return res.status(409).json({ error: 'Esta cuenta de Steam ya está vinculada a otro usuario' });
    }

    const newUser = await User.createSteamUser({
      username,
      email,
      steamId64: steamPayload.steamId,
      profile: {
        persona_name: steamPayload.persona_name,
        avatar_url: steamPayload.avatar_url,
        profile_url: steamPayload.profile_url,
      },
    });

    const sessionToken = issueSessionCookie(res, newUser);

    return res.status(201).json({
      message: 'Cuenta creada con Steam exitosamente',
      token: sessionToken,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        is_profile_public: newUser.is_profile_public,
        avatar_url: newUser.avatar_url,
        avatar_static_url: newUser.avatar_static_url,
        banner_url: newUser.banner_url,
        has_password: newUser.has_password,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El usuario, email o cuenta de Steam ya existe' });
    }
    console.error('Error en completeSignup:', error);
    return res.status(500).json({ error: 'Error al completar el registro con Steam' });
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

    if (!user.password) {
      return res.status(400).json({
        error: 'Define una contraseña antes de desvincular Steam, o perderías el acceso a tu cuenta',
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

// GET /api/steam/import/preview  (autenticado)
const getImportPreview = async (req, res) => {
  try {
    const preview = await steamSyncService.buildImportPreview(req.user.userId);
    res.json(preview);
  } catch (error) {
    console.error('Error en getImportPreview:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Error al generar la vista previa de importación de Steam',
    });
  }
};

// POST /api/steam/import/commit  (autenticado)
const commitImport = async (req, res) => {
  try {
    const { items, ignoredAppIds, manualOverrides } = req.body || {};
    if (!Array.isArray(items) && !Array.isArray(ignoredAppIds)) {
      return res.status(400).json({ error: 'Formato de importación inválido' });
    }

    const result = await steamSyncService.commitImport(req.user.userId, {
      items: items || [],
      ignoredAppIds: ignoredAppIds || [],
      manualOverrides: manualOverrides || [],
    });

    res.json({
      message: 'Biblioteca de Steam importada exitosamente',
      ...result,
    });
  } catch (error) {
    console.error('Error en commitImport:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Error al importar juegos de Steam',
    });
  }
};

module.exports = { startLogin, startLink, callback, completeSignup, getStatus, unlink, getImportPreview, commitImport };