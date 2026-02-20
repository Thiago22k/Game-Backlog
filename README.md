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
- **Axios**: Cliente HTTP para conectarse a la API externa de IGDB.
- **Bcrypt & JSONWebToken (JWT)**: Para el encriptado de contraseñas y la autenticación basada en tokens.
- **Express Rate Limit & CORS**: Middlewares de seguridad.
- **Dotenv**: Manejo de variables de entorno.

### Frontend
- **React 19 & Vite 7**: Librería frontend y entorno de construcción rápido.
- **Tailwind CSS & PostCSS**: Utilizado para el diseño y estilos en toda la interfaz.
- **React Router DOM**: Para el enrutamiento y la navegación SPA.
- **Lucide React**: Biblioteca de iconos SVG.
- **React Hot Toast**: Para notificaciones y alertas en pantalla.

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
  - **`controllers/`**: Controladores de autenticación y de juegos.
  - **`middlewares/`**: Verificación de tokens de autenticación, manejadores de errores y `rateLimiter`.
  - **`models/`**: Consultas y modelos de datos principales (`User`, `Game`).
  - **`routes/`**: Definición de las rutas del API bajo `/api/auth`, `/api/games` y `/api/settings`.
  - **`services/`**: Lógica de interacción y autenticación de la API de IGDB/Twitch.
- **`database-schema.sql`**: Script central de inicialización de la base de datos.
- **`server.js`**: Punto de entrada de la aplicación, configuración de middlewares, rutas y servidor.

### Frontend (`game-backlog-frontend/`)
- **`src/`**
  - **`api/`**: Configuraciones de Axios para interactuar con el backend.
  - **`components/`**: Componentes reutilizables agrupados (ej. `games/`, `layout/`).
  - **`context/`**: Contextos para manejar estados globales (usualmente la autenticación del usuario).
  - **`hooks/`**: Custom hooks (para abstraer lógica repetitiva).
  - **`pages/`**: Páginas principales de la aplicación:
    - `Landing.jsx`: Página de inicio pública.
    - `Explore.jsx`: Buscador/Explorador de juegos de IGDB.
    - `GameDetails.jsx`: Información a fondo de un juego.
    - `Profile.jsx`: Vista del Backlog del usuario (juegos calificados, en lista de deseos, completados, etc.)
    - `Settings.jsx`: Ajustes y preferencias del usuario.
    - `auth/`: Vistas dedicadas de inicio de sesión y registro.
  - **`routes/`**: Archivos de definición de rutas (públicas y privadas).
  - **`App.jsx` & `main.jsx`**: Entradas principales de renderización en React.
- **`tailwind.config.js` & `vite.config.js`**: Configuraciones de diseño y bundling.

---

## ⚙️ Funcionamiento General

1. **Gestión de Cuentas:** Los usuarios pueden crear una cuenta y el sistema guarda sus contraseñas temporalmente usando `bcrypt`. En cada inicio de sesión se entrega un JSON Web Token (JWT).
2. **Exploración:** El frontend se comunica con el endpoint del backend `/api/games/search` que, a su vez, consulta a la API de **IGDB**. Esto evita exponer las credenciales de Twitch en el frontend.
3. **El Backlog (Profile):** Una vez que un usuario encuentra un juego, puede agregarlo a su lista mediante `/api/games/user` proporcionando el estado (ej. `completed`, `playing`, `wishlist`, `dropped`) y una calificación del 1 al 5.
4. **Seguridad:** Rutas tanto de API como de frontend están protegidas (usando `PrivateRoute.jsx` en React y `authLimiter` o Middlewares de token en Express) para evitar acceso no autorizado. Además se integra una correcta estructura de claves en PostgreSQL e indexado para búsquedas rápidas.
