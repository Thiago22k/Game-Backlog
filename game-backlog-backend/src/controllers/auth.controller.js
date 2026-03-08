const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user.model');
const { isValidEmail, isValidPassword, isValidUsername, sanitizeString, sanitizeUsernameAndPreserveCase } = require('../utils/validation');

// Configurar transportador de nodemailer
let transporter;

const initializeTransporter = async () => {
  // If SMTP credentials exist, use them directly (Production / Real Email)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 Servidor configurado con SMTP real (Resend/Brevo/AWS)');
    return;
  }

  // Fallback: Test account (Ethereal) for local development if no SMTP is provided
  nodemailer.createTestAccount((err, account) => {
    if (err) {
      console.error('Failed to create a testing account. ' + err.message);
      return;
    }
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
    console.log('🧪 Servidor de correos configurado en modo prueba (Ethereal)');
  });
};

initializeTransporter();

// Generar JWT
const generateToken = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// ... registro, login, getProfile ...
// Registro de usuario
const register = async (req, res) => {
  try {
    let { username, email, password } = req.body;
    username = sanitizeUsernameAndPreserveCase(username);
    email = sanitizeString(email);

    // Validar que vengan todos los campos
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar formato de email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    // Validar username
    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'Username debe tener entre 3-15 caracteres y solo letras, números y guiones bajos'
      });
    }

    // Validar contraseña
    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el email ya existe
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        error: 'El email ya está registrado'
      });
    }

    // Verificar si el username ya existe
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        error: 'El username ya está en uso'
      });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const newUser = await User.create(username, email, hashedPassword);

    // Generar token
    const token = generateToken(newUser.id, newUser.username, newUser.role);

    // Configurar cookie HttpOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // Responder
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        is_profile_public: newUser.is_profile_public,
        avatar_url: newUser.avatar_url,
        avatar_static_url: newUser.avatar_static_url,
        banner_url: newUser.banner_url,
      }
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      error: 'Error al registrar usuario'
    });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    let { identifier, password } = req.body; // Acepta email o username
    identifier = sanitizeUsernameAndPreserveCase(identifier);

    if (identifier && identifier.includes('@')) {
      identifier = identifier.toLowerCase();
    }

    // Validar que vengan los campos
    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Detectar si el identifier es un email o username
    const isEmail = identifier.includes('@');

    // Buscar usuario por email o username según corresponda
    const user = isEmail
      ? await User.findByEmail(identifier)
      : await User.findByUsername(identifier);

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Comparar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = generateToken(user.id, user.username, user.role);

    // Verificar estado del usuario
    if (user.status === 'banned') {
      return res.status(403).json({
        error: 'Tu cuenta ha sido suspendida por violar las normas de la comunidad.'
      });
    }

    // Configurar cookie HttpOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // Responder (sin enviar el password)
    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_profile_public: user.is_profile_public,
        avatar_url: user.avatar_url,
        avatar_static_url: user.avatar_static_url,
        banner_url: user.banner_url,
        bio: user.bio,
        social_twitch: user.social_twitch,
        social_discord: user.social_discord,
        social_steam: user.social_steam,
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error al iniciar sesión'
    });
  }
};

// Obtener perfil del usuario autenticado
const getProfile = async (req, res) => {
  try {
    // req.user viene del middleware de autenticación
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({
      error: 'Error al obtener perfil'
    });
  }
};

// Solicitar restablecimiento de contraseña
const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    email = sanitizeString(email);

    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    const user = await User.findByEmail(email);

    // Si no existe, igual respondemos success para no revelar qué emails están registrados
    if (!user) {
      return res.json({ message: 'Si el correo existe, se ha enviado un enlace de recuperación.' });
    }

    // Crear token con un secreto único que incluye la contraseña actual (Hash)
    // Así, cuando cambie la contraseña, este token será inválido.
    const secret = process.env.JWT_SECRET + user.password;
    const token = jwt.sign({ email: user.email, id: user.id }, secret, {
      expiresIn: '15m'
    });

    // Usar FRONTEND_URL del entorno o el predeterminado para desarrollo
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?id=${user.id}&token=${token}`;

    const fromAddress = process.env.SMTP_FROM || 'Game Backlog <onboarding@resend.dev>';
    const mailSubject = 'Recuperación de Contraseña';
    const mailText = `Para restablecer tu contraseña, haz clic en este enlace: ${resetLink}`;
    const mailHtml = `<p>Para restablecer tu contraseña, haz clic en este enlace:</p><p><a href="${resetLink}">Restablecer Contraseña</a></p>`;

    // --- RAILWAY SMTP BYPASS ---
    // Railway blocks ports 465/587. If using Resend, we must use their HTTPS REST API instead.
    if (process.env.SMTP_HOST === 'smtp.resend.com' && process.env.SMTP_PASS) {
      try {
        const axios = require('axios');
        await axios.post(
          'https://api.resend.com/emails',
          {
            from: fromAddress,
            to: [user.email],
            subject: mailSubject,
            html: mailHtml,
            text: mailText
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.SMTP_PASS}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('--- PASSWORD RESET EMAIL SENT VIA RESEND HTTP API ---');
      } catch (httpErr) {
        console.error('❌ Error enviando email por Resend HTTP API:', httpErr.response?.data || httpErr.message);
        // Fallback to ethereal if it fails
      }
    } else if (transporter) {
      // Enviar email por SMTP normal (Ethereal o si no están bloqueados los puertos)
      const message = {
        from: fromAddress,
        to: user.email,
        subject: mailSubject,
        text: mailText,
        html: mailHtml
      };

      const info = await transporter.sendMail(message);
      console.log('--- PASSWORD RESET EMAIL SENT BY SMTP ---');
      if (info.messageId && !process.env.SMTP_HOST) {
        // Only log the ethereal URL if using ethereal email
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      console.log('---------------------------------');
    }

    res.json({ message: 'Si el correo existe, se ha enviado un enlace de recuperación.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

// Restablecer contraseña
const resetPassword = async (req, res) => {
  try {
    const { id, token, newPassword } = req.body;

    if (!id || !token || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Intentamos buscar al usuario para obtener su hash actual, 
    // necesitamos todo el objeto de usuario incluyendo el password (User.findByEmail u obtener password con query manual si findById no lo trae)
    // Usamos el query exacto de base de datos para obtener el registro completo (findById no devuelve la pass)
    const pool = require('../config/database');
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Enlace inválido o expirado' });
    }

    const secret = process.env.JWT_SECRET + user.password;

    try {
      // Verificar si el token es válido
      jwt.verify(token, secret);
    } catch (err) {
      return res.status(400).json({ error: 'Enlace inválido o expirado' });
    }

    // Token válido, actualizamos contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await User.changePassword(user.id, hashedPassword);

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
}

// Logout de usuario
const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  });

  res.json({ message: 'Sesión cerrada exitosamente' });
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
};