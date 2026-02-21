const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Validar variables de entorno primero
const validateEnv = require('./src/config/envValidator');
validateEnv();

// Importar configuración de base de datos
const pool = require('./src/config/database');

// Importar middlewares
const requestLogger = require('./src/middlewares/requestLogger');
const errorHandler = require('./src/middlewares/errorHandler');
const { generalLimiter, authLimiter } = require('./src/middlewares/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(requestLogger); // Log de todas las peticiones

// Rate limiting general
app.use('/api', generalLimiter);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const gamesRoutes = require('./src/routes/games.routes');
const settingsRoutes = require('./src/routes/settings.routes');

// Usar rutas
app.use('/api/auth', authLimiter, authRoutes); // Rate limit más estricto para auth
app.use('/api/games', gamesRoutes);
app.use('/api/settings', settingsRoutes);

// Debug: Ver rutas registradas
console.log('📋 Rutas registradas:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`   ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(`   ${Object.keys(handler.route.methods)} ${handler.route.path}`);
      }
    });
  }
});

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
});