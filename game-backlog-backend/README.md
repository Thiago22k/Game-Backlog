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
**POST /api/auth/register** - Registro de usuario. Body: `{ username, email, password }`. Respuesta: `{ user, token }`
**POST /api/auth/login** - Inicio de sesión. Body: `{ email, password }`. Respuesta: `{ user, token }`
**POST /api/auth/logout** - Cierre de sesión y eliminación local.
**POST /api/auth/forgot-password** - Solicitud de recuperación de contraseña con correo. Body: `{ email }`.
**POST /api/auth/reset-password** - Restablecimiento de credenciales con token en URL. Body: `{ token, newPassword }`.
**GET /api/auth/me** (requiere autenticación) - Visualizar al usuario local de la sesión. Headers: `Authorization: Bearer <token>`. Respuesta: `{ user }`

### Juegos
**GET /api/games/search?query=nombre** - Búsqueda genérica de juegos a través de la API en capa cacheada (IGDB).
**GET /api/games/igdb/:id** - Obteniendo detalles de un juego individual de forma estructurada con su meta-información.
**GET /api/games/popular** - Listado de los juegos que logran popularidad actual y gran ratio de visualizaciones.
**GET /api/games/recent** - Listado de los recientes últimos lanzamientos.
**GET /api/games/anticipated** - Títulos de próximo lanzamiento con mayor anticipación en la escena gamer.
**GET /api/games/explore** - Interfaz para explorar filtrando y paginando un número masivo de juegos por diversas tags.
**GET /api/games/genres** - Obtiene taxonomía de géneros.
**GET /api/games/platforms** - Listar taxonomía de las consolas / plataformas.
**GET /api/games/recommendations** (requiere autenticación) - Brinda resultados emulados de recomendaciones dinámicas por un algoritmo y el tracking del jugador.
**GET /api/games/stats/:igdb_game_id** - Consultas de rating y actividad de la comunidad hacia ese juego, promedios en estrellatos y status demográfico.

**Rutas Backlog de Usuario:**
**POST /api/games/user** (requiere auth) - Instanciar la suma de un juego con estatus individual logueado. Body: `{ igdb_game_id, status, rating }`. Status: `completed | playing | wishlist | dropped`.
**GET /api/games/user** (requiere auth) - Listado total o condicionado (por default) del Backlog general en posesión.
**PUT /api/games/user/:igdb_game_id** (requiere auth) - Sobreescribe o enmienda tu calificación y status de guardado del backlog.
**DELETE /api/games/user/:igdb_game_id** (requiere auth) - Eliminarlo del seguimiento de estado.
**GET /api/games/user/:username** (opcional auth) - Permitir buscar y enlistar el backlog bajo una petición visual de otros nombres de usuarios.

**Gestor de Likes / Me Gusta (Juegos):**
**GET /api/games/likes/user/:userId** - Devuelve a qué juegos le dio Like o Heart la ID del sujeto evaluado.
**GET /api/games/likes/by-username/:username** - Mismo endpoint resolutivo hacia nombres de string descriptivos de cuentas.
**GET /api/games/likes/:igdb_game_id** - Consulta el true o false o metadata total del me gusta global para una IP jugable puntual.
**POST /api/games/likes/:igdb_game_id** (requiere auth) - Hace el Toggle on/off de pulsar el componente like en la app.

### Configuración (Settings - requieren auth)
**PUT /api/settings/change-password** - Alteración confirmada de claves de seguridad de acceso.
**PUT /api/settings/update-email** - Mueve su correo verificado a otro.
**PUT /api/settings/update-username** - Enmienda para el string de nickname principal.
**PUT /api/settings/update-profile-visibility** - Bloquear perfiles de fisgoneo y hacer la capa invisible o privada a terceros.
**PUT /api/settings/update-profile** - Actualizar de manera libre datos formales referidos de pronombres e infos en texto de bio del layout principal.
**DELETE /api/settings/delete-account** - Borrando drásticamente a perpetuidad de forma cascada de la DB la cuenta y accesos.

### Colecciones y Listados (Collections)
**GET /api/collections/explore** - Interfaz macro de visualización general abierta ordenando rankings de colecciones de los internautas.
**GET /api/collections/user/:username** - Exposición pública (o con fall-backs) a listas fabricadas para perfiles de username.
**GET /api/collections/liked/user/:username** - Extracción de interacciones logradas al clickar un me gusta.
**GET /api/collections/:id** - Devuelve el desglosado singular en ficha de que se trata cierta colección.
**GET /api/collections/:id/comments** - Obtiene los mensajes sociales en formato foro incrustados de una colección dada bajo `ID`.
**GET /api/collections/contains/:igdb_game_id** - Utilizado para checar visualmente si un ID de juego ya yace listado transversalmente.
**POST /api/collections** (requiere auth) - Inscribe o produce la fundación lógica de colecciones.
**PUT /api/collections/:id** (requiere auth) - Agrega refacciones editadas al master list.
**DELETE /api/collections/:id** (requiere auth) - Purga.
**POST /api/collections/:id/games** (requiere auth) - Engrana y acopla un videojuego preexistente o trackeado de IGDB bajo dicho abanico representativo.
**POST /api/collections/:id/like** (requiere auth) - Ejerce el toggle de Like.
**POST /api/collections/:id/comments** (requiere auth) - Inclusión de comentario.
**DELETE /api/collections/:id/comments/:commentId** (requiere auth) - Deshacer opinión plasmada en foro bajo collection limit map.
**POST /api/collections/:id/report** (requiere auth) - Denunciar penalizablemente un cúmulo listable en forma moderativa.
**POST /api/collections/comments/:commentId/report** (requiere auth) - Enjuiciar de reportes los comentarios vertidos en las subsecciones de lists.

### Actividad Social (Activity / Follows)
**GET /api/activity/users/:username** - Solicitud de Timeline histórico cronológico descriptivo, listando acciones pre-formatadas listos para scroll vertical de sucesos.
**GET /api/users/:username/social** - Tabulador referencial devolviendo contabilidades de los fans que siguen al perfil, u otras entidades que dicho perfil en cuestión sigue con un desglose.
**POST /api/follows/:userId** (requiere auth) - Efectiviza pulsar el enganche social de Follow general.
**DELETE /api/follows/:userId** (requiere auth) - Corte de Follow general (Unfollow).
**GET /api/follows/:userId/status** (requiere auth) - Bandera booleana evaluativa en torno a Follow previo entre actores.

### Reseñas y Análisis de los Usuarios (Reviews)
**GET /api/reviews/popular** - Ranking dinámico global listando Reviews aclamados a nivel logístico, filtrados a likes obtenidos.
**GET /api/reviews/recent** - Flujo visual para alimentar "Latest user inputs" cronológicamente.
**GET /api/reviews/game/:gameId** - Lector general listando el hilo completo global de disertaciones publicadas por todo rol referente al juego en focus ID evaluado.
**GET /api/reviews/:reviewId/comments** - Desplegable in crescendo de ramas de respuestas para una Reseña escrita.
**GET /api/reviews/user/:username/count** - Pura matemática estadística referencial al Profile User referencial de cuantos ha llenado.
**GET /api/reviews/game/:gameId/me** (requiere auth) - Ver si hay ya subido un texto del actor local de modo auto evaluable.
**POST /api/reviews/game/:gameId** (requiere auth) - Ingurgita o Actualiza en forma combinada mediante Payload un análisis con spoilers warning.
**DELETE /api/reviews/game/:gameId** (requiere auth) - Suprimir testimonio digital y valoraciones anexas del DB.
**POST /api/reviews/:reviewId/like** (requiere auth) - Botones de aplauso popular o un Like.
**POST /api/reviews/:reviewId/comments** (requiere auth) - Añade al tablón de respuestas una respuesta a tal Reseña originaria mayor de nivel.
**DELETE /api/reviews/:reviewId/comments/:commentId** (requiere auth) - Expide borrado a la base de su comment indexado propiamente como autor.
**POST /api/reviews/:reviewId/report** (requiere auth) - Sube denuncia de contenido agresivo de Review global, apuntalado hacia mod dashboard en modo estricto.
**POST /api/reviews/comments/:commentId/report** (requiere auth) - Replica de las mismas alertas para la micro-rama.

### Bandeja de Mensajería Push (Notifications)
*(Todos éstos implican flag protegido del middleware `authenticateToken`)* 
**GET /api/notifications** - Retorna payload del socket persistente histórico general indicativo de avisos (alguien dió like a tu review, alguien te empezó a seguir, etc.).
**PUT /api/notifications/read** - Purgador lógico visual deshabilitador de globos de "unread" por totalidad sumergida.
**PUT /api/notifications/:id/read** - Aplica la purga atómica de lectura al aviso interactuado.

### Manejo de Roles, Modulación y Limpieza Pública (Moderation)
*(Todos operan amparados en protecciones de rol estricto: `authenticateToken` + `requireAdmin`)*
**GET /api/moderation/reports** - Cónclave de dashboard administrativo que recoge centralmente de varios origenes denuncias en listas (review, profile, collection, etc) pendientes al resolver/dismiss.
**PATCH /api/moderation/reports/:type/:id/status** - Acción evaluativa centralizada resolutoria desestimativa.
**POST /api/moderation/reports/:id/action** - Impulsar la acción coercitiva y destructiva de censura por flagrante violación resolviendo el ticket y limpiando BD.
**GET /api/moderation/users/search** - Búsqueda de un sujeto, por nombre o correo, de corte gerencial.
**PATCH /api/moderation/users/:id/role** - Manejo de jerarquía, elevador de estatus interno (a Administrador o Usuario básico).
**PATCH /api/moderation/users/:id/status** - Modificar acceso persistente base, expulsiones flagrantes (Baneos).

### File Uploads Form-Data (requieren auth)
**POST /api/users/avatar** - Sinergia Multipart con middleware Multer para almacenar un `<Avatar>`.
**DELETE /api/users/avatar** - Revertir visual custom, volviendo un profile img neutro nulo en PostgreSQL.
**POST /api/users/banner** - Sinergia Multipart subiendo foto rectángular que decora profile con `multer`.
**DELETE /api/users/banner** - Borre seguro logístico del blob y la columan referencial.
**POST /api/users/:id/report** - Reportar perfil personal completo de un usuario con justificaciones argumentadas.

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