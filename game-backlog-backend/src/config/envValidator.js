const requiredEnvVars = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'IGDB_CLIENT_ID',
  'IGDB_CLIENT_SECRET',
  'FRONTEND_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const validateEnv = () => {
  const missing = [];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error('❌ Variables de entorno faltantes:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Revisa tu archivo .env y .env.example\n');
    process.exit(1);
  }

  // Validaciones adicionales
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET debería tener al menos 32 caracteres para mayor seguridad');
  }

  // Warning for missing SMTP in production
  if (process.env.NODE_ENV === 'production' && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.warn('⚠️  ADVERTENCIA: Faltan credenciales SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) en producción. El restablecimiento de contraseñas usará Ethereal (modo prueba).');
  }

  console.log('✅ Variables de entorno validadas correctamente');
};

module.exports = validateEnv;