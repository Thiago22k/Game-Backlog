const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error en consola (en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error completo:', err);
  }

  // Error de PostgreSQL - violación de constraint único
  if (err.code === '23505') {
    const message = 'Este registro ya existe';
    error = new AppError(message, 409);
  }

  // Error de PostgreSQL - violación de foreign key
  if (err.code === '23503') {
    const message = 'Referencia inválida';
    error = new AppError(message, 400);
  }

  // Error de JWT inválido
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = new AppError(message, 401);
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = new AppError(message, 401);
  }

  // Respuesta al cliente
  res.status(error.statusCode || 500).json({
    error: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;