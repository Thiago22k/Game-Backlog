# Game Backlog Frontend

Este es el frontend de la aplicación web Game Backlog, una Single Page Application (SPA) construida en **React 19** y **Vite**.

## Páginas y Rutas Implementadas

El frontend utiliza `react-router-dom` para manejar una arquitectura robusta de rutas protegidas y públicas, integradas por un modelo `ErrorBoundary`/`Suspense` en varios casos. Las principales páginas o vistas del sistema `AppRoutes.jsx` son:

### 1. Páginas Públicas Principales
- `/` (**Landing Page**): La página principal de bienvenida con características, llamada a la acción atractiva y estética general interactiva de la base de datos de usuarios de Backlogs.
- `/explore` (**Explorar Juegos**): Buscador inmenso en comunicación recursiva de la API (IGDB), con filtros (géneros, plataformas, etc.).
- `/collections` (**Explorar Colecciones**): Vista diseñada para descubrir visualmente colecciones de videojuegos armadas por los mismísimos usuarios o administradores para el ojo general.
- `/game/:slug` (**Game Details**): Ficha singular minuciosa por título de juego con datos base (carruseles de imágenes de IGDB, puntuaciones de rating y metadatos) unida a un foro de discusiones y de *Reviews* completas escritas por parte de los jugadores.
- `/collections/:id` (**Collection Details**): El panel de despliegue singular a detalle de una lista de juegos donde las personas votan con likes y debaten.

### 2. Autenticación, Acceso y Recuperación (`/auth/*` flow)
- `/login` (**Login**): Inicio de sesión tradicional de credenciales.
- `/register` (**Registro**): Formulario de alta para la creación de cuenta verificada (Email, Username, Passwords validables y condicionados).
- `/forgot-password` (**Olvidé mi contraseña**): Accesorio de peticiones de enlace por servidor de correo electrónico.
- `/reset-password` (**Restablecer contraseña**): Landing resolutivo procesando Tokens con encadenados de seguridad temporales y validez.

### 3. Vistas de Ecosistema de Perfil de Usuario (Anidadas bajo la ruta `/profile/:username`)
La app conforma un robusto dashboard de seguimiento social visual local (layout unificado de tabs modulares), con visualizaciones disponibles al dominio público o privadas estricto bajo parámetros configurables:
- **Resumen/Stats** (`/`): Una ojeada a estadísticas y tortas representativas (cifras absolutas numéricas de juegos jugados a lo largo del paso del tiempo y logs de actividad reducida).
- **Juegos o Backlog General** (`/games`): Listado modular masivo estructurado del usuario donde cada IP añadida aparece reflejada (sub-agrupada iterativamente por estado de *Jugando*, *Completado*, *Abandonado*, etc.).
- **Colecciones** (`/collections`): El propio arsenal de curaduría de la persona enlistable.
- **Actividad** (`/activity`): Muro informativo, al estilo línea de tiempo de Social Media convencional de updates constantes (como avisos formales de "dejó una review en X", "creó colección Y").
- **Paneles de Interacción Evaluados "Me Gusta"** (`/likes`, `/likes/games`, `/likes/collections`): Toda clase de rastro que su click dinámico en el botón Like por la red a nivel superficial generó, tabulado.
- **Aspecto Social o Networking** (`/social`): Lista bidireccional de seguidores consolidados (Followers) e ídolos seguidos transversalmente (Following), promovedor de comunidad y engagement.

### 4. Vistas Protegidas del Autenticado Real (`PrivateRoute.jsx`)
- `/settings` (**Ajustes de Perfil General**): Panel interactivo y delicado para gestionar con el servicio API de Backend las informaciones nucleares (Renovar contraseña, validar modificación de correos, transvaso de username textual, control condicionado biográfico, perfiles incognito-privado, y panel drag-and-drop de File Upload estético de Avatares y Banners vía multer).
- `/notifications` (**Notificaciones Reales**): Pantalla o buzón condensador interactuando con badges de avisos ("X personas dieron likes a tu review", reportes, etc.), que pueden ser leídos por demanda del front para borrar el badge alertante.
- Formularios en Base `Collection`: `/collections/new` y subruta heredada editar `/collections/:id/edit`, proveyendo las vías formales para un creador de dar a luz mediante inputs a esas famosas agrupaciones.

### 5. Modos Censo y Panel Administrativo Cuidable (`AdminRoute.jsx`)
- `/admin` (**Admin Dashboard**): Un panel exclusivo y hermético a ser visualizado solo con JSONTokens marcados por PostgreSQL en Database como validación del atributo de tabla "admin". Allí es posible revisar los reportes acumulados y las denuncias que llegan por toda la comunidad, resolver si eliminar contenidos insanos de modo irreversible y modular el baneo permanente o mutear cuentas nocivas enteras.

### 6. Miscelánea, Leyes y de Fall-back
- Rutas legales y transparentativas como: `/terms` (**Términos de Servicio**) y `/privacy` (**Políticas de Privacidad**).
- Fallback integral universal en wildcard `/*` para una elegante y temática **Página 404 No Encontrada**.

---

## Tecnologías Adicionales Destacadas Utilizadas Intrínsecamente

- Enrumbado estético modular altamente dominado por **Tailwind CSS**, permitiendo acoplarse e iterar con librerías responsivas y componentes utilitarios por sobre hojas primitivas (utiliza una paleta adaptada estricta, colores core `primary-navy` base oscura, con el contrate vibrante y complementario `primary-yellow`).
- **React Hot Toast**, integrado inteligentemente para notificaciones en la raíz por sobre cualquier re-render, para lanzar informaciones sobre peticiones HTTP exitosas o rechazadas al interactuar con base de datos, en un modelo de notificaciones efímeras pop-up laterales o inferiores.
- Renderizado visual en parte apoyado por las optimizaciones tipográficas y iconógráficas puristas y veloces del paquete estándar masivo `Lucide React` para vectoriales SVG del sistema minimalistas.
- Mantenimiento e inflado de validación de estatus asíncrono atado de fondo al React `AuthContext` envuelto de modo universal; proveyendo el modelo "User" subyacente y los token flows persistentes.
