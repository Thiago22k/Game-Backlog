const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    // Obtener el token de las cookies
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Token no proporcionado'
      });
    }

    // Verificar el token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: 'Token inválido o expirado'
        });
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

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
      next();
    });
  } catch (error) {
    next();
  }
};

module.exports = { authenticateToken, optionalAuth };