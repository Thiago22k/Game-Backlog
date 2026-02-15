const rateLimit = require('express-rate-limit');

// Limitar peticiones generales
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development', // ← Desactivar en desarrollo
});

// Limitar intentos de login/register
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    error: 'Demasiados intentos, intenta de nuevo en 5 minutos'
  },
  skipSuccessfulRequests: true,
  skip: () => process.env.NODE_ENV === 'development', // ← Desactivar en desarrollo
});

module.exports = {
  generalLimiter,
  authLimiter,
};