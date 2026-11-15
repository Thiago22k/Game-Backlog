# Game Backlog Project

Esta es la documentación principal del proyecto **Game Backlog**, una aplicación full-stack diseñada para permitir a los usuarios registrarse, buscar videojuegos utilizando la API de IGDB (Twitch) y mantener un registro personal de sus juegos con estados y calificaciones.

El proyecto está dividido en dos partes principales:
- `game-backlog-backend`: Una API RESTful en Node.js con Express y PostgreSQL.
- `game-backlog-frontend`: Una aplicación web (SPA) constuida con React, Vite y Tailwind CSS.

---

## 🚀 Tecnologías Usadas

### Backend
- **Node.js & Express**: Framework web para la API.
- **PostgreSQL**: Base de datos relacional. Configuración soportada por el paquete `pg`.
- **Axios**: Cliente HTTP para conectarse a las APIs externas de IGDB y Steam Web API.
- **Bcrypt & JSONWebToken (JWT)**: Para el encriptado de contraseñas y la autenticación basada en tokens / cookies HTTP-only.
- **OpenID 2.0**: Para autenticación y vinculación directa con cuentas de Steam.
- **Node-cron**: Planificador de tareas en segundo plano para sincronización automática de bibliotecas y monitoreo de precios/ofertas de Steam.
- **Express Rate Limit & CORS**: Middlewares de seguridad.
- **Dotenv**: Manejo de variables de entorno.

### Frontend
- **React 19 & Vite 7**: Librería frontend y entorno de construcción rápido.
- **Tailwind CSS & PostCSS**: Utilizado para el diseño y estilos en toda la interfaz.
- **React Router DOM**: Para el enrutamiento y la navegación SPA con carga perezosa (`React.lazy` + `Suspense`).
- **Lucide React & React Icons**: Bibliotecas de iconos SVG.
- **React Hot Toast**: Para notificaciones y alertas en pantalla.
- **BroadcastChannel API**: Para sincronizar eventos de autenticación por ventana emergente (Steam popup auth).

---

## 🛠 Instalación y Configuración

### 1. Base de Datos (PostgreSQL)
1. Inicia sesión en tu servidor PostgreSQL.
2. Ejecuta los comandos disponibles en `game-backlog-backend/database-schema.sql` para crear la base de datos, las tablas de `users` y `user_games`, y los índices:
   ```sql
   CREATE DATABASE game_backlog;
   \c game_backlog;
   -- (ejecutar el resto del archivo SQL)
   ```

### 2. Configurar el Backend
1. Navega al directorio del backend:
   ```bash
   cd game-backlog-backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Copia el archivo `.env.example` a `.env` y ajusta las variables necesarias:
   - Credenciales de la base de datos PostgreSQL.
   - Secretos JWT (`JWT_SECRET`).
   - Credenciales de Twitch/IGDB (`TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET`).
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   El servidor normalmente correrá en `http://localhost:3000`.

### 3. Configurar el Frontend
1. Navega al directorio del frontend:
   ```bash
   cd game-backlog-frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura el archivo `.env` del frontend con la URL del API del Backend. Ejemplo:
   ```
   VITE_API_URL=http://localhost:3000/api
   ```
4. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```

---

## 📂 Estructura del Proyecto

### Backend (`game-backlog-backend/`)
- **`src/`**
  - **`config/`**: Configuración de conexión a base de datos y validación de `.env`.
  - **`controllers/`**: Controladores de autenticación, juegos, reseñas, perfil social, colecciones y moderación.
  - **`middlewares/`**: Verificación de tokens de auth, validación de roles de usuario, manejadores de errores y `rateLimiter`.
  - **`models/`**: Consultas y modelos de datos principales iterando sobre la BD PostgreSQL (`User`, `Game`, `Review`, `Collection`, etc.).
  - **`routes/`**: Archivos de definición de cada endpoint de API (Auth, Games, Settings, Collections, Uploads, Activity, Notifications, Reviews, Follows y Moderation).
  - **`services/`**: Lógica de interacción y caché con la API de IGDB/Twitch.
- **`database-schema.sql`**: Script central de inicialización de la base de datos con tablas vinculadas relacionales.
- **`server.js`**: Punto de entrada de la aplicación HTTP, configuración de middlewares (como `helmet` y `cors`), rutas y servidor express.

### Frontend (`game-backlog-frontend/`)
- **`src/`**
  - **`api/`**: Configuraciones de la instancia de Axios.
  - **`components/`**: Componentes reutilizables de UI (tarjetas, botones, layouts) y módulos de características, incluyendo subcarpetas `games/`, `collections/`, `routing/`, etc.
  - **`context/`**: Contextos para manejar estados globales clave, siendo la Autenticación el primordial.
  - **`hooks/`**: Custom hooks de React (ej. para pre-carga y configuración asíncrona).
  - **`pages/`**: Páginas y vistas principales divididas por funcionalidad.
    - Se incluyen vistas de Landing, Explorar por IGDB, Panel de Administración, Configuración de Ajustes (`Settings`), y un riguroso árbol de sub-vistas bajo `profile/` para el usuario específico.
    - Vistas legales auxiliares de `LegalPrivacy.jsx` y `TermsOfService.jsx`.
  - **`routes/`**: Archivos que definen y empaquetan en lazy-loading los destinos: `AppRoutes.jsx`, con divisiones claras como `PrivateRoute`, `PublicRoute`, y `AdminRoute`.
  - **`utils/`**: Utilitarios genéricos (parseos de fecha, transformadores numéricos de likes, etc.).
- **`tailwind.config.js` & `vite.config.js`**: Reglamentaciones base del empaquetador y frameworks visuales interrelacionados.

---

## ⚙️ Funcionamiento General

1. **Gestión de Cuentas y Seguridad:** Los usuarios pueden crear una cuenta, iniciar sesión y restablecer su contraseña de ser necesario mediante JWT. Las contraseñas están resguardadas con encriptación. Adicionalmente se aplican Rate Limiters y las rutas están protegidas según jerarquías u opciones de privacidad del perfil (público/privado).
2. **Exploración Ampliada:** El frontend se basa en múltiples endpoints en `/api/games/...` que acceden indirectamente e iteran resultados de forma eficiente a IGDB. Se permite el filtrado avanzado y el trackeo de lo más anticipado.
3. **El Backlog (Juegos y Perfil):** Los jugadores pueden mantener un historial individual de cada juego mediante los estados de Backlog (`completed`, `playing`, `wishlist`, `dropped`) y sus puntuaciones. Este ecosistema conforma el eje del Perfil de Usuario, que tiene amplias opciones estéticas (como upload de fotos mediante `multer`).
4. **Reseñas (Reviews):** Los usuarios escriben reseñas analíticas por título jugado. La comunidad puede interactuar a través de botones de Like a lo largo del flujo y creando árboles de comentarios.
5. **Colecciones y Listas:** La plataforma permite organizar y exponer listas de títulos catalogados por el usuario para su fácil descubrimiento público en una grilla exploratoria abierta a Likes comunitarios.
6. **Entorno Social (Follows y Activity):** A fin de conectar usuarios con visiones similares de gaming, es posible seguir perfiles. Las acciones que sus integrantes efectúen (como añadir juegos, seguir personas, o escribir reseñas) irán poblando un muro o "Activity Feed" global y generando alertas hacia la bandeja centralizada de notificaciones visual en tiempo real.
7. **Integración con Steam:**
   - **Autenticación y Vinculación:** Inicio de sesión y registro directo mediante Steam OpenID en ventanas emergentes no invasivas, además de vinculación de cuentas existentes desde `Settings`.
   - **Importación Masiva de Biblioteca:** Mapeo inteligente con IGDB considerando tiempo de juego, actividad reciente y asignación automática/manual de estados.
   - **Logros en Tiempo Real:** Visualización del progreso y porcentaje de logros de Steam directamente en los detalles de cada juego.
   - **Alertas de Descuentos en Wishlist:** Notificaciones automáticas cuando un título deseado entra en oferta en Steam Store.
   - **Sincronización Automática:** Jobs periódicos de actualización de biblioteca y horas jugadas.
8. **Panel de Moderación y Reportes (Admin Dashboard):** Aquellos administradores designados poseen interfaz privilegiada para moderar cualquier contenido inapropiado o violatorio reportado internamente en cualquier subnivel (ya sea perfiles, colecciones, reseñas puntuales o mismos comentarios menores). Tienen la potestad técnica de desestimar reportes o de aplicar baneos correctivos a usuarios.
