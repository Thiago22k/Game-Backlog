# Especificación de Diseño: Navbar & Sidebar de Stackd

> **Ubicación:** `design/` (Independiente de los paquetes `game-backlog-backend`, `game-backlog-frontend` y `stackd-desktop-tauri`).  
> **Prototipo Interactivo:** Puedes abrir directamente en cualquier navegador el archivo [preview.html](file:///c:/Users/Thiago/Desktop/Game-Backlog-main/Game-Backlog-main/game-backlog/design/preview.html) para probar los estados, animaciones y atajos de teclado (`Ctrl+K`).

---

## 1. Fundamentos y Tokens de Diseño

Basado en la arquitectura descrita en el `README.md` y `PROJECT_CONTEXT.md` (autenticación JWT, integración Steam, metadatos IGDB y gestión de estados de backlog: `playing`, `completed`, `wishlist`, `dropped`), la interfaz sigue un diseño oscuro de alto contraste y aspecto *gamer moderno* con toques de neón sutiles.

| Token | Valor Hex | Uso en Navbar / Sidebar |
|---|---|---|
| `primary.navy-ultra-dark` | `#08090d` | Fondo base de la barra superior, badges neutros, kbd shortcuts |
| `primary.navy-dark` | `#12141d` | Fondo principal de la Sidebar y menús desplegables (Dropdowns) |
| `primary.navy` | `#0f111a` | Fondo del lienzo principal |
| `primary.navy-light` | `#1b1d26` | Fondos de botones secundarios, inputs de búsqueda y hover states |
| `primary.cyan` | `#4dd4ac` | Indicador de **Juego en Vivo**, logros de Steam y acentos activos |
| `primary.yellow` | `#ffde59` | Logotipo, icono de búsqueda, estados destacados y pestaña Biblioteca |
| `primary.blue` | `#4a7cff` | Enlaces secundarios y acentos informativos |
| `primary.violet` | `#8b7cf6` | Sección "Recomendados" y tags de algoritmos |
| `rose-500` | `#f43f5e` | Badge de notificaciones pendientes y acción de Cerrar sesión |

---

## 2. Elementos Requeridos y Anatomía de Componentes

### 2.1 Logo / Marca
- **Isotipo:** Glifo isométrico vectorizado con gradiente angular (#4dd4ac → #ffde59).
- **Logotipo:** Tipografía oficial "STACKD" en blanco con acento amarillo en la letra "D".
- **Comportamiento:** Enlace raíz que redirige a `/profile/:username/games` (si el usuario está autenticado) o `/explore` (invitados).

### 2.2 Navegación Principal
1. **Biblioteca (con contador de juegos):**
   - Icono: `Library` (Lucide).
   - Badge pill: Contador numérico dinámico obtenido de la consulta `GET /api/games/user` (ej: `48`).
   - Estado activo: Línea inferior de resplandor (`shadow-[0_0_8px_rgba(255,222,89,0.8)]`).
2. **Explorar:**
   - Icono: `Compass`.
   - Navegación al catálogo global de IGDB con filtros por género, popularidad y fecha.
3. **Recomendados:**
   - Icono: `Sparkles`.
   - Motor de recomendaciones basado en títulos calificados y backlog del usuario.
4. **Colecciones:**
   - Icono: `FolderKanban`.
   - Acceso a listas personalizadas públicas y colaborativas.

### 2.3 Buscador Global Rápido (`Ctrl+K`)
- **Presentación:** Botón con icono `Search` en color amarillo (#ffde59) y atajo visual `<kbd>Ctrl+K</kbd>`.
- **Interacción:** Al hacer clic o presionar la combinación de teclas `Ctrl+K` (o `Cmd+K` en macOS), despliega un modal centrado con backdrop blur para búsqueda predictiva en tiempo real sobre IGDB y títulos locales.

### 2.4 Indicador de Juego en Vivo (Condicional)
- **Activación:** Se muestra únicamente cuando se detecta un juego activo vía proceso nativo en la app de escritorio o sesión sincronizada de Steam.
- **Visual:** Píldora con borde y fondo cyan translúcido, icono de mando (`Gamepad2`) con animación `animate-pulse` y radar de actividad (`animate-ping`).
- **Acción:** Al hacer clic, abre un modal con tiempo de juego, logros de Steam y botón directo a la ficha técnica.

### 2.5 Notificaciones
- **Icono:** Campana (`Bell`) con badge rojo (`bg-rose-500`) indicando el número de alertas no leídas (ej: "3").
- **Desplegable:** Lista de eventos prioritarios:
  - Alertas de descuentos de Steam Store en la lista de deseos (*Wishlist*).
  - Likes y comentarios en reseñas de la comunidad.
  - Sincronización automática de biblioteca / logros.

### 2.6 Menú de Usuario Desplegable
- **Disparador:** Avatar de usuario con borde gamer, indicador de estado online verde y nombre de usuario truncado.
- **Opciones del Desplegable:**
  1. `Mi Perfil` (`User` icon): Enlace a `/profile/:username`.
  2. `Estadísticas` (`BarChart3` icon): Resumen de horas, géneros más jugados y distribución de ratings.
  3. `Favoritos` (`Heart` icon): Acceso directo a juegos con 5 estrellas o marcados como favoritos.
  4. `Ajustes` (`Settings` icon): Configuración de cuenta, vinculación de Steam y privacidad.
  5. *Separador visual*
  6. `Cerrar sesión` (`LogOut` icon): Botón en tono rose con confirmación y limpieza de token/cookie de sesión.

---

## 3. Código Fuente Modular para Reutilización (React + Tailwind)

### 3.1 Componente Navbar (`design/NavbarComponent.jsx`)

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Library, Compass, Sparkles, FolderKanban, 
  Search, Bell, User, BarChart3, Heart, Settings, LogOut, Gamepad2, ChevronDown 
} from 'lucide-react';

export default function StackdNavbar({
  user,
  gameCount = 0,
  activeGame = null, // e.g. { name: "Cyberpunk 2077", id: 1020 }
  unreadCount = 0,
  onSearchOpen,
  onLogout
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="h-[60px] bg-[#12141d]/95 backdrop-blur-md px-6 flex items-center justify-between gap-4 border-b border-white/[0.08] select-none sticky top-0 z-40" ref={menuRef}>
      {/* Izquierda: Logotipo + Enlaces */}
      <div className="flex items-center gap-8 h-full">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/assets/isotipo.svg" alt="Stackd" className="w-7 h-7" />
          <img src="/assets/logotipo.svg" alt="STACKD" className="h-4.5 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-1 h-full">
          <a href="/library" className="relative h-full px-3.5 flex items-center gap-2 text-xs font-semibold text-[#ffde59]">
            <Library className="w-4 h-4 text-[#ffde59]" />
            <span>Biblioteca</span>
            {gameCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffde59]/20 text-[#ffde59] border border-[#ffde59]/30">
                {gameCount}
              </span>
            )}
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#ffde59] rounded-t-full shadow-[0_0_8px_rgba(255,222,89,0.8)]" />
          </a>
          <a href="/explore" className="h-full px-3.5 flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition">
            <Compass className="w-4 h-4" />
            <span>Explorar</span>
          </a>
          <a href="/recommendations" className="h-full px-3.5 flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition">
            <Sparkles className="w-4 h-4" />
            <span>Recomendados</span>
          </a>
          <a href="/collections" className="h-full px-3.5 flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition">
            <FolderKanban className="w-4 h-4" />
            <span>Colecciones</span>
          </a>
        </nav>
      </div>

      {/* Derecha: Acciones Rápidas */}
      <div className="flex items-center gap-3">
        {/* Indicador de Juego en Vivo (Condicional) */}
        {activeGame && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4dd4ac]/10 border border-[#4dd4ac]/30 text-[#4dd4ac] text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4dd4ac] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4dd4ac]" />
            </span>
            <Gamepad2 className="w-3.5 h-3.5 animate-pulse" />
            <span className="truncate max-w-[150px]">{activeGame.name}</span>
          </div>
        )}

        {/* Buscador Rápido Ctrl+K */}
        <button onClick={onSearchOpen} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#1b1d26] hover:bg-[#222533] border border-white/10 hover:border-[#ffde59]/40 text-xs text-gray-400 transition cursor-pointer">
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#ffde59]" />
            <span className="hidden sm:inline">Buscar...</span>
          </span>
          <kbd className="hidden md:inline px-1.5 py-0.5 rounded bg-[#08090d] text-[10px] font-mono border border-white/10">Ctrl+K</kbd>
        </button>

        {/* Campana de Notificaciones */}
        <div className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-lg bg-[#1b1d26] hover:bg-[#222533] text-gray-300 relative border border-white/10">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Menú de Usuario */}
        {user && (
          <div className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#1b1d26] hover:bg-[#222533] border border-white/10">
              <img src={user.avatar_url || '/default-avatar.png'} alt={user.username} className="w-6 h-6 rounded-md object-cover" />
              <span className="text-xs font-semibold text-gray-200">{user.username}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#12141d] border border-white/10 shadow-2xl py-1.5 z-50">
                <a href={`/profile/${user.username}`} className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5">
                  <User className="w-3.5 h-3.5 text-[#ffde59]" /> Mi Perfil
                </a>
                <a href={`/profile/${user.username}/stats`} className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#4dd4ac]" /> Estadísticas
                </a>
                <a href={`/profile/${user.username}/favorites`} className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" /> Favoritos
                </a>
                <a href="/settings" className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5">
                  <Settings className="w-3.5 h-3.5 text-[#8b7cf6]" /> Ajustes
                </a>
                <div className="my-1 border-t border-white/5" />
                <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left">
                  <LogOut className="w-3.5 h-3.5 text-rose-400" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
```

---

## 4. Archivos Entregados en el Directorio `design/`

1. **[preview.html](file:///c:/Users/Thiago/Desktop/Game-Backlog-main/Game-Backlog-main/game-backlog/design/preview.html)**: Prototipo interactivo completo listo para abrir en cualquier explorador web, con selector de vista (Navbar horizontal, Sidebar vertical o vista combinada), simulación de juego en vivo ON/OFF, contador dinámico, modales reales de `Ctrl+K` y menús desplegables.
2. **`design/assets/`**: Copias autónomas de los activos oficiales de la marca (`isotipo.svg`, `logotipo.svg` y `logo_stackd.svg`).
3. **`design/NAVBAR_SIDEBAR_SPEC.md`**: Este documento técnico con la especificación completa, tablas de tokens y código reutilizable.
