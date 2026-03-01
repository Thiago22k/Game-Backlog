const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authenticateToken = (req, res, next) => {
  try {
    // Obtener el token de las cookies
    const token = req.cookies?.token;

    if (!token) {
      if (req.originalUrl === '/api/auth/me') {
        return res.status(200).json({ user: null });
      }
      return res.status(401).json({
        error: 'Token no proporcionado'
      });
    }

    // Verificar el token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: 'Token inválido o expirado'
        });
      }

      // Check user status
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (user.status === 'banned') {
        return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
      }

      // Agregar información del usuario al request
      req.user = decoded; // { userId: 1, iat: ..., exp: ... }
      next();
    });

  } catch (error) {
    console.error('Error en authenticateToken:', error);
    res.status(500).json({
      error: 'Error al verificar token'
    });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    // Obtener el token de las cookies
    const token = req.cookies?.token;

    if (!token) {
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (!err) {
        // En optional, no bloqueamos la petición pero tampoco agregamos el user si está baneado
        const user = await User.findById(decoded.userId);
        if (user && user.status !== 'banned') {
          req.user = decoded;
        }
      }
      next();
    });
  } catch (error) {
    next();
  }
};

module.exports = { authenticateToken, optionalAuth };