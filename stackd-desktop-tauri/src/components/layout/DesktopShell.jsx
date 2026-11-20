import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { getAllLinkedExecutables } from "../../utils/localExecutables";
import {
    syncDesktopPreferencesToRust,
    updateTrayStatus,
} from "../../utils/desktopPreferences";
import {
    Library,
    Compass,
    Astroid,
    Bell,
    Search,
    Gamepad2,
    ChevronsUpDown,
    User,
    BarChart3,
    Heart,
    Settings,
    LogOut,
    LogIn,
    Home,
    PanelLeftClose,
    PanelLeftOpen,
    PlayingCardsFan,
    Menu,
    X,
} from "lucide-react";
import axios from "../../api/axios";
import { ENDPOINTS } from "../../utils/constants";
import toast from "react-hot-toast";
import { getGameCover } from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";
import { getAvatarUrl } from "../../utils/avatar";
import SearchModal from "./SearchModal";
import logoStackd from "../../assets/logotipo.svg";
import isotipo from "../../assets/isotipo.svg";

function recordLocalLastPlayed(igdbGameId) {
    if (!igdbGameId) return;
    try {
        const raw = localStorage.getItem("stackd_last_played");
        const map = raw ? JSON.parse(raw) : {};
        map[String(igdbGameId)] = Date.now();
        localStorage.setItem("stackd_last_played", JSON.stringify(map));
    } catch {
        // Silencioso
    }
}

function formatSessionMinutes(startMs) {
    if (!startMs) return "En curso";
    const mins = Math.max(0, Math.floor((Date.now() - startMs) / 60000));
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export default function DesktopShell() {
    const { user, logout } = useAuth();
    const { unreadCount = 0 } = useNotifications?.() || {};
    const navigate = useNavigate();

    const [collapsed, setCollapsed] = useState(
        () => localStorage.getItem("stackd_sidebar_collapsed") === "true"
    );
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [libraryGames, setLibraryGames] = useState([]);
    const [detectedGame, setDetectedGame] = useState(null);
    const [sessionStart, setSessionStart] = useState(null);
    const [, setTick] = useState(0);

    const userMenuRef = useRef(null);

    // Cargar y mantener sincronizada la biblioteca en DesktopShell
    const fetchShellLibrary = () => {
        if (!user) return;
        axios
            .get(ENDPOINTS.GAMES.USER_GAMES)
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.games || [];
                setLibraryGames(list);
                // Si hay un juego activo en sesión, actualizar también su objeto/status en activeSessionRef
                if (activeSessionRef.current) {
                    const updated = list.find(
                        (g) => g.igdb_game_id === activeSessionRef.current.game.igdb_game_id
                    );
                    if (updated) {
                        activeSessionRef.current.game = updated;
                    }
                }
            })
            .catch(() => { });
    };

    useEffect(() => {
        syncDesktopPreferencesToRust();
    }, []);

    useEffect(() => {
        fetchShellLibrary();
        window.addEventListener("stackd:library-updated", fetchShellLibrary);
        return () => window.removeEventListener("stackd:library-updated", fetchShellLibrary);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const toggleCollapse = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("stackd_sidebar_collapsed", String(next));
            return next;
        });
        setUserMenuOpen(false);
    };

    // Cargar biblioteca para contador y detección en vivo
    useEffect(() => {
        if (!user) return;
        axios
            .get(ENDPOINTS.GAMES.USER_GAMES)
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.games || [];
                setLibraryGames(list);
            })
            .catch(() => { });
    }, [user]);

    // Atajos de teclado (Ctrl+K y Escape) y cierre del menú de usuario
    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsSearchOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setUserMenuOpen(false);
                setDrawerOpen(false);
            }
        };
        const onMouseDown = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("mousedown", onMouseDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("mousedown", onMouseDown);
        };
    }, []);

    const activeSessionRef = useRef(null); // { game, startMs }

    useEffect(() => {
        if (!libraryGames.length) return;

        const ELIGIBLE_AUTO_PROMPT_STATUSES = new Set(["backlog", "wishlist"]);
        const MIN_SESSION_MINUTES_FOR_PROMPT = 2;

        const handleSessionEnded = async (game, startedAtMs) => {
            if (!game || !startedAtMs) return;
            const elapsedMinutes = Math.floor((Date.now() - startedAtMs) / 60000);

            recordLocalLastPlayed(game.igdb_game_id);
            window.dispatchEvent(new Event("stackd:library-updated"));

            // 1. Guardar minutos en backend solo si el .exe está verificado
            const linked = getAllLinkedExecutables()[String(game.igdb_game_id)];
            if (linked?.verified === true && elapsedMinutes >= 1) {
                try {
                    await axios.post(ENDPOINTS.GAMES.LOG_SESSION(game.igdb_game_id), {
                        minutes: elapsedMinutes,
                    });
                    setLibraryGames((prev) =>
                        prev.map((item) =>
                            item.igdb_game_id === game.igdb_game_id
                                ? {
                                    ...item,
                                    playtime_minutes:
                                        Number(item.playtime_minutes || 0) + elapsedMinutes,
                                }
                                : item
                        )
                    );
                    window.dispatchEvent(new Event("stackd:library-updated"));
                    toast.success(
                        `Saved ${elapsedMinutes}m of playtime for ${game.name || game.game_details?.name || "game"
                        }`,
                        { id: `session-saved-${game.igdb_game_id}` }
                    );
                } catch {
                    // Silencioso si está offline
                }
            }

            // 2. Si estaba en backlog o wishlist y jugó >= 2 min, mostrar toast interactivo
            if (
                elapsedMinutes >= MIN_SESSION_MINUTES_FOR_PROMPT &&
                ELIGIBLE_AUTO_PROMPT_STATUSES.has(game.status)
            ) {
                setTimeout(() => promptBacklogToPlaying(game), 350);
            }
        };

        const scan = async () => {
            try {
                const procs = await invoke("get_running_processes");
                const linkedMap = getAllLinkedExecutables();

                const match = libraryGames.find((g) => {
                    const linked = linkedMap[String(g.igdb_game_id)];
                    if (linked?.fileName) {
                        const targetExe = linked.fileName.toLowerCase();
                        const targetBase = targetExe.replace(/\.exe$/i, "");
                        const matchedByExe = procs.some((p) => {
                            const rawName = (p.name || p.exe_name || "").toLowerCase();
                            const normName = (p.normalized_name || "").toLowerCase();
                            return (
                                rawName === targetExe ||
                                rawName === targetBase ||
                                normName === targetBase
                            );
                        });
                        if (matchedByExe) return true;
                    }

                    const title = (g.name || g.game_details?.name || "").toLowerCase();
                    if (title.length < 3) return false;
                    return procs.some((p) => {
                        const pn = (p.normalized_name || "").toLowerCase();
                        return pn.length >= 3 && (title.includes(pn) || pn.includes(title));
                    });
                });

                const current = activeSessionRef.current;

                if (match && (!current || current.game.igdb_game_id !== match.igdb_game_id)) {
                    if (current) {
                        handleSessionEnded(current.game, current.startMs);
                    }
                    const now = Date.now();
                    activeSessionRef.current = { game: match, startMs: now };
                    setDetectedGame(match);
                    setSessionStart(now);
                    recordLocalLastPlayed(match.igdb_game_id);
                    window.dispatchEvent(new Event("stackd:library-updated"));
                    const title = match.name || match.game_details?.name || "a game";
                    updateTrayStatus(`Playing ${title}`);
                } else if (!match && current) {
                    activeSessionRef.current = null;
                    setDetectedGame(null);
                    setSessionStart(null);
                    handleSessionEnded(current.game, current.startMs);
                    updateTrayStatus("Session tracker active");
                }
            } catch {
                // Silencioso
            }
        };

        scan();
        const scanTimer = setInterval(scan, 5000);
        const uiTimer = setInterval(() => setTick((t) => t + 1), 60000);
        return () => {
            clearInterval(scanTimer);
            clearInterval(uiTimer);
        };
    }, [libraryGames]);

    const username = user?.username;

    const navItems = [
        { id: "home", to: "/", label: "Inicio", icon: Home, end: true },
        ...(username
            ? [
                {
                    id: "library",
                    to: `/profile/${username}/games`,
                    label: "Biblioteca",
                    icon: Library,
                    count: libraryGames.length || null,
                },
            ]
            : []),
        { id: "explore", to: "/explore", label: "Explorar", icon: Compass },
        {
            id: "recommendations",
            to: "/recommendations",
            label: "Recomendados",
            icon: Astroid,
        },
        {
            id: "collections",
            to: "/collections",
            label: "Colecciones",
            icon: PlayingCardsFan,
        },
    ];

    const userMenuLinks = username
        ? [
            { to: `/profile/${username}`, label: "Mi Perfil", icon: User },
            {
                to: `/profile/${username}/stats`,
                label: "Estadísticas",
                icon: BarChart3,
            },
            { to: `/profile/${username}/likes`, label: "Favoritos", icon: Heart },
            { to: "/settings", label: "Ajustes", icon: Settings },
        ]
        : [{ to: "/settings", label: "Ajustes", icon: Settings }];

    const handleLogout = async () => {
        setUserMenuOpen(false);
        await logout();
        navigate("/login");
    };

    const promptBacklogToPlaying = (game) => {
        const details = game?.game_details || game || {};
        const gameId = game?.igdb_game_id || details?.id;
        const gameName = details?.name || game?.name || "this game";
        const coverUrl = getGameCover(details);

        toast.custom(
            (t) => (
                <div
                    className={`${t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                        } pointer-events-auto w-full max-w-sm rounded-2xl bg-primary-navy p-3.5 shadow-2xl shadow-black/70 transition-all duration-200 flex items-center gap-3.5`}
                >
                    {/* Carátula compacta */}
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-primary-navy-dark">
                        <img
                            src={coverUrl}
                            alt={gameName}
                            className="h-full w-full object-cover"
                        />
                    </div>

                    {/* Texto + botones de acción */}
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-cyan">
                            Session Ended
                        </p>
                        <p className="mt-0.5 text-xs text-gray-300 leading-snug">
                            You recently played{" "}
                            <span className="font-bold text-white">{gameName}</span>. Move it to{" "}
                            <span className="font-semibold text-primary-yellow">Playing</span>?
                        </p>

                        <div className="mt-2.5 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    toast.dismiss(t.id);
                                    try {
                                        await axios.put(ENDPOINTS.GAMES.UPDATE(gameId), {
                                            status: "playing",
                                            rating: game.rating ?? null,
                                        });
                                        setLibraryGames((prev) =>
                                            prev.map((item) =>
                                                item.igdb_game_id === gameId
                                                    ? { ...item, status: "playing" }
                                                    : item
                                            )
                                        );
                                        window.dispatchEvent(new Event("stackd:library-updated"));
                                        toast.success(`${gameName} moved to Playing`);
                                    } catch {
                                        toast.error("Failed to update status");
                                    }
                                }}
                                className="rounded-lg bg-primary-yellow px-3 py-1.5 text-xs font-bold text-primary-navy transition-colors hover:bg-yellow-300 cursor-pointer"
                            >
                                Move to Playing
                            </button>

                            <button
                                type="button"
                                onClick={() => toast.dismiss(t.id)}
                                className="rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.12] hover:text-white cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            ),
            {
                id: `backlog-prompt-${gameId}`,
                duration: 15000, // 15 segundos visible antes de cerrarse solo
                position: "bottom-right",
            }
        );
    };

    return (
        <div className="h-screen w-screen bg-primary-navy text-white flex overflow-hidden">
            {/* Botón drawer en ventanas estrechas */}
            <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir menú"
                className="fixed left-3 top-3 z-30 grid h-11 w-11 place-items-center rounded-xl bg-primary-navy-dark text-white shadow-lg shadow-black/40 border border-white/10 lg:hidden cursor-pointer"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Scrim móvil */}
            <div
                onClick={() => setDrawerOpen(false)}
                className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
            />

            {/* Sidebar única */}
            <aside
                data-c={collapsed}
                aria-label="Navegación principal"
                className={`group fixed inset-y-0 left-0 z-50 flex flex-col bg-primary-navy-dark border-r border-white/[0.07] transition-[transform,width] duration-200 lg:static lg:translate-x-0 shrink-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"
                    } ${collapsed ? "w-[76px]" : "w-[268px]"}`}
            >
                {/* 1 · Marca + notificaciones */}
                <div
                    className={`flex h-[72px] shrink-0 items-center ${collapsed ? "justify-center px-0" : "justify-between px-5"
                        }`}
                >
                    <div
                        onClick={() =>
                            navigate(username ? `/profile/${username}/games` : "/explore")
                        }
                        className="flex items-center gap-2.5 rounded-lg cursor-pointer"
                    >
                        <img src={isotipo} alt="Stackd" className="w-8 h-8 shrink-0" />
                        {!collapsed && (
                            <img src={logoStackd} alt="STACKD" className="h-5 w-auto" />
                        )}
                    </div>

                    {!collapsed && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => navigate("/notifications")}
                                aria-label={
                                    unreadCount > 0
                                        ? `Notificaciones, ${unreadCount} sin leer`
                                        : "Notificaciones"
                                }
                                className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-200 transition-colors hover:bg-white/[0.06] cursor-pointer"
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary-yellow px-1 text-[10px] font-bold text-primary-navy ring-2 ring-primary-navy-dark"
                                    >
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setDrawerOpen(false)}
                                aria-label="Cerrar menú"
                                className="grid h-10 w-10 place-items-center rounded-xl text-gray-400 hover:bg-white/[0.06] lg:hidden cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* 2 · Buscador global IGDB */}
                <div className={collapsed ? "px-3 pb-2" : "px-4 pb-2"}>
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        aria-label="Buscar (Ctrl+K)"
                        title="Buscar en IGDB (Ctrl+K)"
                        className={`flex h-11 w-full items-center gap-3 rounded-xl bg-primary-navy text-sm text-gray-400 transition-colors hover:text-white cursor-pointer ${collapsed ? "justify-center px-0" : "px-3.5"
                            }`}
                    >
                        <Search className="h-[18px] w-[18px] shrink-0 text-primary-yellow" />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">Buscar…</span>
                                <kbd className="rounded-md bg-white/[0.07] px-1.5 py-0.5 font-sans text-[11px] font-medium text-gray-400">
                                    Ctrl K
                                </kbd>
                            </>
                        )}
                    </button>
                </div>

                {/* 3 · Navegación */}
                <nav
                    className={`flex-1 overflow-y-auto custom-scrollbar py-3 ${collapsed ? "px-3" : "px-4"
                        }`}
                >
                    {!collapsed && (
                        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            Tu espacio
                        </p>
                    )}
                    <ul className="space-y-1">
                        {navItems.map(({ id, to, label, icon: Icon, count, end }) => (
                            <li key={id}>
                                <NavLink
                                    to={to}
                                    end={end}
                                    onClick={() => setDrawerOpen(false)}
                                    title={collapsed ? label : undefined}
                                    className={({ isActive }) =>
                                        `flex h-11 items-center gap-3 rounded-xl text-sm font-medium transition-colors ${collapsed ? "justify-center px-0" : "px-3"
                                        } ${isActive
                                            ? "bg-primary-yellow text-primary-navy font-semibold"
                                            : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon className="h-5 w-5 shrink-0" />
                                            <span className={collapsed ? "sr-only" : ""}>{label}</span>
                                            {!collapsed && count != null && (
                                                <span
                                                    className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${isActive
                                                        ? "bg-primary-navy/15 text-primary-navy"
                                                        : "bg-white/[0.07] text-gray-400"
                                                        }`}
                                                >
                                                    {count}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* 4 · Juego en vivo (condicional) */}
                {detectedGame && (
                    <div className={collapsed ? "px-3 pb-3" : "px-4 pb-3"}>
                        <div
                            onClick={() => navigate(`/game/${detectedGame.slug || detectedGame.game_details?.slug || detectedGame.igdb_game_id}`)}
                            role="status"
                            title={`Jugando ahora: ${detectedGame.name || detectedGame.game_details?.name
                                }`}
                            className={`flex items-center gap-3 rounded-2xl bg-primary-navy-light border border-primary-cyan/25 cursor-pointer hover:border-primary-cyan/50 transition ${collapsed ? "justify-center p-1.5" : "p-2.5"
                                }`}
                        >
                            <span className="relative shrink-0">
                                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary-cyan/30 to-primary-blue/30">
                                    <Gamepad2 className="h-5 w-5 text-primary-cyan" />
                                </span>
                                {collapsed && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute -right-1 -top-1 block h-3 w-3 rounded-full bg-primary-cyan ring-2 ring-primary-navy-dark"
                                    />
                                )}
                            </span>

                            {!collapsed && (
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-cyan">
                                        <span className="stackd-eq flex h-3 items-end gap-[2px]">
                                            <i />
                                            <i />
                                            <i />
                                        </span>
                                        <span>Jugando ahora</span>
                                    </span>
                                    <span className="block truncate text-sm font-semibold text-white">
                                        {detectedGame.name || detectedGame.game_details?.name}
                                    </span>
                                    <span className="block text-xs tabular-nums text-gray-400">
                                        Sesión · {formatSessionMinutes(sessionStart)}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* 5 · Usuario / Invitado + contraer */}
                <div
                    ref={userMenuRef}
                    className="relative border-t border-white/[0.07] p-3"
                >
                    {user ? (
                        <>
                            <button
                                onClick={() => setUserMenuOpen((prev) => !prev)}
                                aria-haspopup="menu"
                                aria-expanded={userMenuOpen}
                                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.06] cursor-pointer ${userMenuOpen ? "bg-white/[0.06]" : ""
                                    } ${collapsed ? "justify-center" : ""}`}
                            >
                                <img
                                    src={getAvatarUrl(user, { animated: false })}
                                    alt={user.username}
                                    className="h-10 w-10 shrink-0 rounded-full object-cover bg-primary-navy"
                                />
                                {!collapsed && (
                                    <>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-white">
                                                {user.username}
                                            </span>
                                            <span className="block truncate text-xs text-gray-400">
                                                @{user.username}
                                            </span>
                                        </span>
                                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
                                    </>
                                )}
                            </button>

                            {userMenuOpen && (
                                <div
                                    role="menu"
                                    className={`absolute z-20 rounded-2xl bg-primary-navy-light p-1.5 shadow-2xl shadow-black/70 ${collapsed
                                        ? "left-[calc(100%+8px)] bottom-3 w-56"
                                        : "bottom-[calc(100%+4px)] left-3 right-3"
                                        }`}
                                >
                                    {userMenuLinks.map(({ to, label, icon: Icon }) => (
                                        <button
                                            key={to}
                                            role="menuitem"
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                navigate(to);
                                            }}
                                            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-gray-200 hover:bg-white/[0.07] cursor-pointer"
                                        >
                                            <Icon className="h-[18px] w-[18px] text-gray-400" />
                                            {label}
                                        </button>
                                    ))}
                                    <div className="mx-2 my-1 h-px bg-white/[0.08]" />
                                    <button
                                        role="menuitem"
                                        onClick={handleLogout}
                                        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                                    >
                                        <LogOut className="h-[18px] w-[18px]" />
                                        Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </>
                    ) : collapsed ? (
                        <button
                            onClick={() => navigate("/login")}
                            title="Iniciar sesión"
                            aria-label="Iniciar sesión"
                            className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary-yellow text-primary-navy hover:bg-yellow-300 transition cursor-pointer"
                        >
                            <LogIn className="h-5 w-5" />
                        </button>
                    ) : (
                        <div className="rounded-2xl bg-primary-navy-light p-3 flex flex-col gap-2">
                            <p className="text-xs text-gray-400 leading-snug">
                                Inicia sesión para sincronizar tu biblioteca y reseñas.
                            </p>
                            <button
                                onClick={() => navigate("/login")}
                                className="w-full h-9 rounded-xl bg-primary-yellow hover:bg-yellow-300 text-primary-navy font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <LogIn className="h-4 w-4" />
                                Iniciar sesión
                            </button>
                            <button
                                onClick={() => navigate("/register")}
                                className="w-full h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-200 font-semibold text-xs transition cursor-pointer"
                            >
                                Crear cuenta
                            </button>
                        </div>
                    )}

                    {/* Campana en modo colapsado (solo autenticados) */}
                    {user && collapsed && (
                        <button
                            onClick={() => navigate("/notifications")}
                            aria-label="Notificaciones"
                            title="Notificaciones"
                            className="relative mx-auto mt-2 grid h-10 w-10 place-items-center rounded-xl text-gray-200 hover:bg-white/[0.06] cursor-pointer"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary-yellow ring-2 ring-primary-navy-dark"
                                />
                            )}
                        </button>
                    )}

                    {/* Botón contraer */}
                    <button
                        onClick={toggleCollapse}
                        aria-label={
                            collapsed ? "Expandir barra lateral" : "Contraer barra lateral"
                        }
                        aria-expanded={!collapsed}
                        className={`mt-1 hidden h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white lg:flex cursor-pointer ${collapsed ? "justify-center px-0" : ""
                            }`}
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
                        ) : (
                            <>
                                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
                                <span>Contraer</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* Contenido principal */}
            <main className="flex-1 h-full min-w-0 overflow-y-auto custom-scrollbar bg-primary-navy">
                <Outlet />
            </main>

            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </div>
    );
}