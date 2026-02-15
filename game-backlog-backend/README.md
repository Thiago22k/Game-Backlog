# Game Backlog Backend

Backend para una aplicación de backlog de videojuegos. Permite a los usuarios registrarse, buscar juegos a través de la API de IGDB, y mantener un registro personal de juegos completados con calificaciones.

## Tecnologías

- Node.js
- Express
- PostgreSQL
- JWT para autenticación
- API de IGDB (Twitch)

## Requisitos previos

- Node.js (v14 o superior)
- PostgreSQL (v12 o superior)
- Cuenta de desarrollador de Twitch para credenciales de IGDB

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
```

3. Crear la base de datos PostgreSQL:
```sql
CREATE DATABASE game_backlog;
```

4. Ejecutar el script de creación de tablas (ver `database-schema.sql`)

5. Copiar `.env.example` a `.env` y configurar las variables:
```bash
cp .env.example .env
```

6. Editar `.env` con tus credenciales

## Ejecutar en desarrollo
```bash
npm run dev
```

## Endpoints

### Autenticación

**POST /api/auth/register**
- Body: `{ username, email, password }`
- Respuesta: `{ user, token }`

**POST /api/auth/login**
- Body: `{ email, password }`
- Respuesta: `{ user, token }`

**GET /api/auth/me** (requiere autenticación)
- Headers: `Authorization: Bearer <token>`
- Respuesta: `{ user }`

### Juegos

**GET /api/games/search?query=nombre**
- Busca juegos en IGDB
- Respuesta: `{ results, games }`

**GET /api/games/igdb/:id**
- Obtiene detalles de un juego específico
- Respuesta: `{ game }`

**POST /api/games/user** (requiere autenticación)
- Body: `{ igdb_game_id, status, rating }`
- Status: completed | playing | wishlist | dropped
- Rating: 1-5 (opcional)
- Respuesta: `{ game }`

**GET /api/games/user?status=completed** (requiere autenticación)
- Obtiene juegos del usuario
- Query param `status` es opcional
- Respuesta: `{ total, games }`

**PUT /api/games/user/:igdb_game_id** (requiere autenticación)
- Body: `{ status?, rating? }`
- Respuesta: `{ game }`

**DELETE /api/games/user/:igdb_game_id** (requiere autenticación)
- Respuesta: `{ message }`

## Estructura del proyecto
```
game-backlog-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── envValidator.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── games.controller.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── requestLogger.js
│   ├── models/
│   │   ├── user.model.js
│   │   └── game.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── games.routes.js
│   ├── services/
│   │   └── igdb.service.js
│   └── utils/
│       ├── AppError.js
│       └── validation.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Seguridad

- Contraseñas encriptadas con bcrypt
- Autenticación con JWT
- Rate limiting en endpoints de autenticación
- Validación de entradas
- Queries SQL parametrizadas (prevención de SQL injection)

## Variables de entorno

Ver `.env.example` para la lista completa de variables requeridas.

## Licencia

ISC