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
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
const helmet = require('helmet');
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to allow images to load on the frontend
}));

// Middlewares globales
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:1420',
  'http://127.0.0.1:1420',
  'http://tauri.localhost',
  'https://tauri.localhost',
  'tauri://localhost',
  'https://game-backlog-ivory.vercel.app',
  'https://bstackd.vercel.app'
];
// Add FRONTEND_URL from env if it's set and not already in the list
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('tauri://') || origin.includes('tauri.localhost')) {
      return callback(null, true);
    }
    // Allow any Vercel deployment for preview/production
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger); // Log de todas las peticiones

// Servir archivos estáticos (como el avatar)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
const collectionsRoutes = require('./src/routes/collections.routes');
const uploadRoutes = require('./src/routes/upload.routes');
const activityRoutes = require('./src/routes/activity.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const reviewRoutes = require('./src/routes/review.routes');
const followRoutes = require('./src/routes/follow.routes');
const moderationRoutes = require('./src/routes/moderation.routes');

// Usar rutas
app.use('/api/auth', authLimiter, authRoutes); // Rate limit más estricto para auth
app.use('/api/games', gamesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/users', uploadRoutes); // Mapeamos users/avatar a nuestros uploadRoutes
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api', followRoutes); // Montado en /api porque tiene rutas tanto para /follows como para /users
app.use('/api/moderation', moderationRoutes);

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