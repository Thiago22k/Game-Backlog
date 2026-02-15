const { Pool } = require('pg');
require('dotenv').config();

// Crear pool de conexiones a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Probar conexión inmediatamente al importar este módulo
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL');
  }
});

// Manejar errores inesperados del pool
pool.on('error', (err) => {
  console.error('❌ Error inesperado en PostgreSQL:', err);
  process.exit(-1);
});

module.exports = pool;