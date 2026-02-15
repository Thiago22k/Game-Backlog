class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Diferencia entre errores operacionales y bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;