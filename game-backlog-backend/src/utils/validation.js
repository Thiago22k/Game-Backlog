// Validar formato de email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validar fortaleza de contraseña
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Validar username
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
};

// Validar rating (0.5-5 en incrementos de 0.5, o null)
const isValidRating = (rating) => {
  if (rating === null || rating === undefined) return true;
  const n = Number(rating);
  return !isNaN(n) && n >= 0.5 && n <= 5 && (n * 2) % 1 === 0;
};

// Validar status de juego
const isValidGameStatus = (status) => {
  const validStatuses = ['completed', 'playing', 'wishlist', 'dropped', 'backlog'];
  return validStatuses.includes(status);
};

// Validar que sea un número entero positivo
const isPositiveInteger = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0;
};

// Sanitizar string (eliminar espacios y convertir a lowercase)
const sanitizeString = (str) => {
  return str ? str.trim().toLowerCase() : '';
};

// Sanitizar username (eliminar espacios pero preservar mayúsculas/minúsculas)
const sanitizeUsernameAndPreserveCase = (str) => {
  return str ? str.trim() : '';
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  isValidRating,
  isValidGameStatus,
  isPositiveInteger,
  sanitizeString,
  sanitizeUsernameAndPreserveCase,
};