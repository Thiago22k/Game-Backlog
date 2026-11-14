# CONTEXTO DEL PROYECTO: STACKD (Game Backlog)

> **Propósito de este documento:** Proveer todo el contexto técnico, arquitectónico, modelo de datos, convenciones y estado actual del proyecto a un Asistente / IA de desarrollo que no tiene acceso al repositorio de código fuente.

---

## 1. Visión General del Proyecto

**Stackd** (Game Backlog) es una plataforma web completa tipo *Letterboxd* o *Backloggd* pero enfocada en videojuegos. Permite a los jugadores:
- Rastrear su progreso en videojuegos con estados (`playing`, `completed`, `backlog`, `wishlist`, `dropped`).
- Calificar juegos (0.5 a 5.0 estrellas con medios puntos).
- Escribir y explorar reseñas de la comunidad (con soporte para spoilers).
- Crear y compartir colecciones temáticas de videojuegos.
- Sistema social: seguir usuarios, dar "likes" a juegos y colecciones, y feed de actividad en tiempo real.
- Integración directa con **IGDB (Internet Game Database - Twitch API)** para metadatos masivos y carátulas.
- **Integración con Steam (En progreso):** Sincronización de biblioteca, tiempos de juego, estado de vinculación y mapeo a IGDB.

---

## 2. Stack Tecnológico

### Frontend
- **Framework:** React 18 con Vite.
- **Routing:** `react-router-dom` v6 con rutas perezosas (`React.lazy` + `Suspense`).
- **Estilos:** Tailwind CSS con paleta temática oscura personalizada.
- **Iconografía:** `lucide-react`, `react-icons`.
- **Notificaciones:** `react-hot-toast`.
- **HTTP Client:** Axios con configuración global (`withCredentials: true` para cookies HTTP-only).

### Backend
- **Runtime:** Node.js + Express.
- **Base de Datos:** PostgreSQL con `pg` (Pool de conexiones).
- **Autenticación:** JWT almacenado en cookies HTTP-only (`authenticateToken`), con soporte para `optionalAuth`.
- **Cifrado:** `bcrypt` para contraseñas.
- **Imágenes / Subidas:** Cloudinary + `multer` (para avatares y banners).
- **APIs Externas:**
  - IGDB API (autenticación mediante Twitch OAuth `client_credentials`).
  - Steam Web API (autenticación y consulta de perfiles/juegos).

---

## 3. Estructura de Directorios

```text
game-backlog/
├── game-backlog-backend/
│   ├── migrations/                  # Migraciones SQL incrementales
│   │   └── 001_steam_integration.sql
│   ├── public/                      # Archivos estáticos / uploads locales
│   ├── src/
│   │   ├── config/                  # DB Pool, Cloudinary, Env Validator
│   │   ├── controllers/             # auth, games, reviews, collections, steam, etc.
│   │   ├── middlewares/             # auth (JWT), errorHandler, rateLimiter, requestLogger
│   │   ├── models/                  # Consultas directas a Postgres (User, Game, Review, Steam, etc.)
│   │   ├── routes/                  # Express Routers montados en /api/*
│   │   ├── services/                # igdb.service.js, steam.service.js, recommendation.service.js
│   │   └── utils/                   # Validadores, AppError, helpers
│   ├── database-schema.sql          # Esquema completo de la base de datos
│   └── server.js                    # Punto de entrada de la API Express
│
├── game-backlog-frontend/
│   ├── src/
│   │   ├── api/                     # Instancia configurada de axios, servicios específicos
│   │   ├── assets/                  # Logos, SVGs, imágenes estáticas
│   │   ├── components/
│   │   │   ├── auth/                # AuthLayout, etc.
│   │   │   ├── collections/         # Modales y formularios de colecciones
│   │   │   ├── common/              # Modales de confirmación, RatingBadge, selectores
│   │   │   ├── games/               # InteractiveGameCard, StarRating, StatusMenu, Skeletons
│   │   │   ├── layout/              # Navbar, Footer, SearchModal
│   │   │   ├── reviews/             # ReviewCard, ReviewModal, ReviewsPanel
│   │   │   └── settings/            # SteamConnectionCard, etc.
│   │   ├── context/                 # AuthContext (user, login, logout, register, me)
│   │   ├── hooks/                   # useGames, useGameLikes, useFollow, useSEO, useCardMenu
│   │   ├── pages/                   # Landing, Explore, GameDetails, Settings, Profile/*
│   │   ├── routes/                  # AppRoutes, PrivateRoute, PublicRoute, AdminRoute
│   │   └── utils/                   # Constantes (ENDPOINTS), formateadores de imagen/fecha
│   ├── tailwind.config.js           # Tokens de colores y configuración estética
│   └── vite.config.js
```

---

## 4. Modelo de Datos (PostgreSQL)

### Tablas Principales
1. **`users`**:
   - `id`, `username`, `email`, `password`, `role` (`user`, `admin`, `moderator`), `status` (`active`, `banned`).
   - `is_profile_public`, `avatar_url`, `banner_url`, `bio`, redes sociales.
2. **`user_games`** (El backlog central del usuario):
   - `id`, `user_id`, `igdb_game_id`, `status`, `rating` (0.5 a 5.0).
   - `completed_at`, `created_at`, `updated_at`.
   - `source` (`manual` | `steam`), `status_set_by` (`user` | `steam`), `steam_appid`, `playtime_minutes`, `last_played_at`.
   - **Restricción:** `UNIQUE (user_id, igdb_game_id)`.
3. **`igdb_cache`**:
   - Caché local en BD para evitar exceder el rate limit de IGDB.
   - `igdb_id`, `slug`, `name`, `data` (JSONB con todos los metadatos), `updated_at`.
4. **`reviews`** & **`review_likes`** / **`review_comments`**:
   - Reseñas por usuario y juego con calificación, spoiler tag, plataforma y contenido.
5. **`collections`** & **`collection_games`**:
   - Colecciones de juegos públicas/privadas.
6. **`game_likes`**: Likes dados a juegos por IGDB ID.
7. **`activity_logs`**: Feed de actividad global/seguidores.

### Tablas de Steam (Fases 1 y 2 implementadas)
1. **`steam_accounts`**:
   - `user_id` (FK `users`), `steam_id64`, `persona_name`, `avatar_url`, `profile_url`, `auto_sync`, `last_sync_at`, `last_sync_status`.
2. **`steam_igdb_map`**:
   - Mapeo global entre `steam_appid` y `igdb_game_id`. `match_status` (`matched`, `needs_review`, `unmatched`, `skipped_dlc`).
3. **`steam_library`**:
   - Copia espejo de los juegos de la cuenta Steam por usuario: `user_id`, `steam_appid`, `name`, `playtime_minutes`, `last_played_at`, `ignored`.

---

## 5. Convenciones de Estados y Reglas de Negocio

### Estados de Juego (`status`)
Los 5 estados canónicos en BD y backend son:
- `'playing'` (Jugando)
- `'completed'` (Completado)
- `'backlog'` (Pendiente / En cola)
- `'wishlist'` (Lista de deseados)
- `'dropped'` (Abandonado)

> **Importante:** El estado "Not in Library" / "Sin jugar" **NO es un string en BD**. Se representa como la ausencia del registro en `user_games` (o `status = null` en el cliente). Si el usuario selecciona "Not in Library", la acción correspondiente es `DELETE` del registro en `user_games`.

### Sistema de Calificaciones (`rating`)
- Valores permitidos: de `0.5` a `5.0` en incrementos de `0.5` (10 niveles: 0.5, 1.0, 1.5, ... 5.0).
- `null` si no ha sido calificado.

---

## 6. Convenciones de Código y Frontend

### Colores Tailwind (`tailwind.config.js`)
- `primary-navy-ultra-dark`: `#08090d`
- `primary-navy-dark`: `#12141d`
- `primary-navy`: `#0f111a`
- `primary-navy-light`: `#1b1d26`
- `primary-yellow`: `#ffde59` (Color de acento principal)
- `primary-blue`: `#4a7cff`
- `primary-cyan`: `#4dd4ac`
- `primary-violet`: `#8b7cf6` (Usado en el estado default "Not in library" / Add to library)

### Manejo de API y Autenticación
- Axios configurado en `src/api/axios.js` con `baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'`.
- Rutas protegidas usan cookie JWT (`withCredentials: true`). En el backend, `authenticateToken` extrae `req.user.userId`.
- `optionalAuth` se usa en endpoints públicos donde el contenido cambia si hay un usuario logueado (ej. saber si ya le dio like o su propio status).

---

## 7. Estado Actual de la Integración con Steam

### Implementado hasta la fecha (Fases 1, 2 y 3)

#### 1. Base de Datos
- Migración `001_steam_integration.sql`: Tablas `steam_accounts`, `steam_igdb_map`, `steam_library`, y campos extendidos en `user_games` (`source`, `status_set_by`, `steam_appid`, `playtime_minutes`, `last_played_at`).
- Migración `002_steam_auth.sql`: Soporte para usuarios creados exclusivamente vía Steam (contraseña opcional y flags asociados).

#### 2. Backend
- `src/services/steam.service.js`:
  - Manejo de OpenID 2.0 (construcción de URLs de autenticación, verificación de assertions criptográficas).
  - Consulta a Steam Web API (`GetPlayerSummaries`, `GetOwnedGames`, resolución de Vanity URLs).
  - Firma y verificación de estados JWT (`signState`, `verifyState`) y tokens temporales de registro (`signSignupToken`, `verifySignupToken`).
- `src/services/steamSync.service.js`:
  - Algoritmo de mapeo e importación masiva de juegos de Steam contra IGDB (coincidencia por nombre, filtrado y resolución).
- `src/controllers/steam.controller.js`:
  - `GET /api/steam/login`: Inicia el flujo OpenID (soporta flujo popup mediante parámetros `popup` y `origin`).
  - `POST /api/steam/link`: Inicia vinculación de Steam para usuarios autenticados.
  - `GET /api/steam/callback`: Recibe la respuesta de Steam, autentica al usuario o redirige a registro / settings.
  - `POST /api/steam/signup`: Finaliza el registro para nuevos usuarios que provienen de Steam.
  - `GET /api/steam/status` y `DELETE /api/steam/unlink`: Consulta y desvinculación de cuenta Steam.
  - `GET /api/steam/import/preview` y `POST /api/steam/import`: Previsualización y confirmación de importación masiva de biblioteca.

#### 3. Frontend
- **Autenticación con Popup (BroadcastChannel & postMessage fallback):**
  - `useSteamPopup.js` y `useSteamLinkPopup.js`: Hooks que abren una ventana popup para autenticación o vinculación con Steam sin perder el estado de la página actual.
  - `src/pages/auth/SteamCallback.jsx` y `src/utils/steamAuthChannel.js`: Página puente que procesa el callback en el popup y notifica a la ventana principal vía canal cruzado.
  - Botón de "Continue with Steam" en `Login.jsx` y `Register.jsx`.
  - Flujo de completar registro en `SteamRegister.jsx`.
- **Gestión e Importación:**
  - `SteamConnectionCard.jsx`: Estado de conexión, vinculación/desvinculación con confirmación segura y botón de importación.
  - `SteamImportModal.jsx`: Modal completo para seleccionar qué juegos importar a la biblioteca de Stackd con asignación de estados.

### Siguientes Fases del Plan de Steam
1. **Fase 4:** Detección automática y sugerencia inteligente de estados basada en `playtime` (ej: 0 minutos -> `backlog`, jugados en las últimas 2 semanas -> `playing`).
2. **Fase 5:** Sincronización automática periódica / background worker para refrescar bibliotecas activas.
3. **Fase 6:** Sincronización de logros de Steam y visualización en el perfil / game details.

---

## 8. Guía para Escribir Código en este Proyecto
1. **Modularidad en Backend:** Seguir el patrón `routes -> controller -> model / service`. Los modelos ejecutan queries directas con `pool.query(sql, [params])`.
2. **Resiliencia en IGDB:** Todo llamado a IGDB debe verificar caché primero (`IgdbCache`) o utilizar paralelismo (`Promise.all`) para no penalizar tiempos de respuesta.
3. **Consistencia Visual:** Usar los componentes reutilizables (`InteractiveGameCard`, `StarRating`, `CustomSelect`, Skeletons en lugar de spinners).
4. **Respuestas JSON limpias:** Siempre devolver mensajes de error descriptivos con status code semánticos (`400`, `401`, `404`, `409`, `500`).
