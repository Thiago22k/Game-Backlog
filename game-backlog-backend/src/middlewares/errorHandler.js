const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;


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

  // Log del error en consola (siempre visible para depuración del admin localmente y en logs en producción)
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error completo:', err);
  }

  // Respuesta al cliente (jamás incluir stack trace por seguridad)
  res.status(error.statusCode || 500).json({
    error: error.message || 'Error interno del servidor',
  });
};

module.exports = errorHandler;