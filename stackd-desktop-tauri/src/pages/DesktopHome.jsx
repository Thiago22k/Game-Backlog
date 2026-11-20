import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
    getLinkedExecutable,
    getAllLinkedExecutables,
} from "../utils/localExecutables";
import GameSettingsModal from "../components/games/GameSettingsModal";
import {
    Play,
    RefreshCw,
    Astroid,
    Gamepad2,
    Compass,
    LogIn,
    ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../api/axios";
import { ENDPOINTS } from "../utils/constants";
import { useAuth } from "../context/AuthContext";
import { getGameCover } from "../utils/formatters";
import SteamLinkBanner from "../components/profile/SteamLinkBanner";
import SteamImportModal from "../components/settings/SteamImportModal";
import useSteamLinkPrompt from "../hooks/useSteamLinkPrompt";
import SteamIcon from "../assets/steam-icon.svg?react";
import isotipo from "../assets/isotipo.svg";
import logoStackd from "../assets/logotipo.svg";
import ContinuePlayingCard from "../components/games/ContinuePlayingCard";
import ReadyToPlayCard from "../components/games/ReadyToPlayCard";

function getPlaytimeMinutes(item) {
    if (!item) return 0;
    return Number(item.playtime_minutes ?? item.playtime_forever ?? 0);
}

export default function DesktopHome() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [userGames, setUserGames] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [trendingGames, setTrendingGames] = useState([]);
    const [steamStatus, setSteamStatus] = useState(null);
    const [syncingSteam, setSyncingSteam] = useState(false);
    const [runningGameId, setRunningGameId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [settingsGame, setSettingsGame] = useState(null);
    const [installedSteamIds, setInstalledSteamIds] = useState(() => new Set());
    const [achievementsMap, setAchievementsMap] = useState({});

    const activeSettingsGame = useMemo(
        () =>
            userGames.find((g) => g.igdb_game_id === settingsGame?.igdb_game_id) ||
            settingsGame,
        [userGames, settingsGame]
    );

    const loadDashboard = async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            if (user) {
                setTrendingGames([]);
                const [gamesRes, steamRes, recsRes] = await Promise.allSettled([
                    axios.get(ENDPOINTS.GAMES.USER_GAMES),
                    axios.get(ENDPOINTS.STEAM.STATUS),
                    axios.get(ENDPOINTS.GAMES.RECOMMENDATIONS, { params: { limit: 8 } }),
                ]);

                if (gamesRes.status === "fulfilled") {
                    const raw = Array.isArray(gamesRes.value.data)
                        ? gamesRes.value.data
                        : gamesRes.value.data?.games || [];
                    setUserGames(raw);
                }
                if (steamRes.status === "fulfilled") {
                    setSteamStatus(steamRes.value.data);
                }
                if (recsRes.status === "fulfilled") {
                    setRecommendations(recsRes.value.data?.games || []);
                }
                try {
                    const ids = await invoke("get_installed_steam_appids");
                    setInstalledSteamIds(new Set(ids.map(Number)));
                } catch {
                    setInstalledSteamIds(new Set());
                }
            } else {
                setUserGames([]);
                setRecommendations([]);
                setSteamStatus(null);
                setRunningGameId(null);

                const popRes = await axios.get(ENDPOINTS.GAMES.POPULAR, {
                    params: { limit: 10 },
                });
                setTrendingGames(popRes.data?.games || popRes.data || []);
            }
        } catch {
            // Silencioso
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        const onLibraryUpdated = () => loadDashboard({ silent: true });
        window.addEventListener("stackd:library-updated", onLibraryUpdated);
        return () =>
            window.removeEventListener("stackd:library-updated", onLibraryUpdated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const steamPrompt = useSteamLinkPrompt({
        enabled: Boolean(user),
        onImported: () => loadDashboard(),
    });

    // Detectar si alguno de los juegos está abierto ahora mismo
    useEffect(() => {
        if (!user || !userGames.length) return;
        const checkRunning = async () => {
            try {
                const procs = await invoke("get_running_processes");
                const linkedMap = getAllLinkedExecutables();

                const active = userGames.find((g) => {
                    // 1. Coincidencia exacta por ejecutable local vinculado (ej. PES2017.exe)
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

                    // 2. Fallback por nombre del juego (Steam / sin .exe vinculado)
                    const title = (g.name || g.game_details?.name || "").toLowerCase();
                    if (title.length < 3) return false;
                    return procs.some((p) => {
                        const pn = (p.normalized_name || "").toLowerCase();
                        return pn.length >= 3 && (title.includes(pn) || pn.includes(title));
                    });
                });

                setRunningGameId(active ? active.igdb_game_id : null);
            } catch {
                // Silencioso
            }
        };
        checkRunning();
        const timer = setInterval(checkRunning, 5000);
        return () => clearInterval(timer);
    }, [user, userGames]);

    const localRecentMap = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("stackd_last_played") || "{}");
        } catch {
            return {};
        }
    }, [userGames, runningGameId]);

    // Ordenar por actividad reciente real (en ejecución primero, luego última sesión / fecha)
    const orderedGames = useMemo(() => {
        if (!userGames.length) return [];

        const getLastActivityTs = (g) => {
            const localTs = Number(localRecentMap[String(g.igdb_game_id)] || 0);
            const playedTs = g.last_played_at
                ? new Date(g.last_played_at).getTime()
                : 0;
            if (localTs > 0 || playedTs > 0) {
                return Math.max(localTs, Number.isNaN(playedTs) ? 0 : playedTs);
            }
            // Respaldo solo si nunca se ha jugado (sin usar updated_at para que un sync no lo suba)
            const createdTs = new Date(g.created_at || 0).getTime();
            return Number.isNaN(createdTs) ? 0 : createdTs;
        };

        return [...userGames].sort((a, b) => {
            if (a.igdb_game_id === runningGameId) return -1;
            if (b.igdb_game_id === runningGameId) return 1;
            return getLastActivityTs(b) - getLastActivityTs(a);
        });
    }, [userGames, runningGameId, localRecentMap]);

    const continueCards = orderedGames.slice(0, 4);

    // Hidratar logros de Steam solo para las 4 tarjetas visibles en Continue Playing
    useEffect(() => {
        if (!user || !continueCards.length) return;

        const targets = continueCards
            .map((item) => {
                const igdbId = item.igdb_game_id;
                const isSteam = Boolean(
                    item.source === "steam" ||
                    item.steam_appid ||
                    item.game_details?.steam_appid
                );
                return { igdbId, isSteam };
            })
            .filter((t) => t.igdbId && t.isSteam && !(t.igdbId in achievementsMap));

        if (!targets.length) return;

        Promise.allSettled(
            targets.map(async ({ igdbId }) => {
                const res = await axios.get(ENDPOINTS.STEAM.GAME_ACHIEVEMENTS(igdbId));
                const { supported, summary } = res.data || {};
                return {
                    igdbId,
                    total: supported ? Number(summary?.total || 0) : 0,
                    unlocked: supported ? Number(summary?.unlocked || 0) : 0,
                };
            })
        ).then((results) => {
            const next = {};
            for (const r of results) {
                if (r.status === "fulfilled") {
                    next[r.value.igdbId] = {
                        total: r.value.total,
                        unlocked: r.value.unlocked,
                    };
                }
            }
            if (Object.keys(next).length > 0) {
                setAchievementsMap((prev) => ({ ...prev, ...next }));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, continueCards]);

    const readyToPlayGames = useMemo(() => {
        if (!userGames.length) return [];
        const linkedMap = getAllLinkedExecutables();

        return userGames
            .filter((g) => {
                const appId = Number(
                    g.steam_appid || g.game_details?.steam_appid || 0
                );
                const hasLocalExe = Boolean(
                    linkedMap[String(g.igdb_game_id)]?.exePath
                );
                const isSteamInstalled = appId > 0 && installedSteamIds.has(appId);
                return hasLocalExe || isSteamInstalled;
            })
            .sort((a, b) => {
                if (a.igdb_game_id === runningGameId) return -1;
                if (b.igdb_game_id === runningGameId) return 1;
                return getPlaytimeMinutes(b) - getPlaytimeMinutes(a);
            });
    }, [userGames, installedSteamIds, runningGameId]);

    const isGameRunning = (gameItem) => {
        if (!gameItem || !runningGameId) return false;
        return gameItem.igdb_game_id === runningGameId;
    };

    const handleLaunchGame = async (gameItem) => {
        const details = gameItem.game_details || gameItem;
        const gameTitle = details.name || gameItem.name || "";
        const appId = gameItem.steam_appid || details.steam_appid;
        const slug = details.slug || gameItem.slug || gameItem.igdb_game_id;

        if (isGameRunning(gameItem)) {
            toast("This game is already running");
            return;
        }

        try {
            const procs = await invoke("get_running_processes");
            const titleLower = gameTitle.toLowerCase();
            const alreadyOpen =
                titleLower.length >= 3 &&
                procs.some((p) => {
                    const pn = p.normalized_name.toLowerCase();
                    return (
                        pn.length >= 3 &&
                        (titleLower.includes(pn) || pn.includes(titleLower))
                    );
                });

            if (alreadyOpen) {
                setRunningGameId(gameItem.igdb_game_id);
                toast("This game is already running");
                return;
            }
        } catch {
            // Continuar si el comando no responde
        }

        const linkedExe = getLinkedExecutable(gameItem.igdb_game_id);
        if (linkedExe?.exePath) {
            try {
                await invoke("launch_local_executable", { exePath: linkedExe.exePath });
                setRunningGameId(gameItem.igdb_game_id);
                toast.success(`Launching ${gameTitle}...`);
            } catch (err) {
                toast.error(typeof err === "string" ? err : "Failed to launch game");
            }
            return;
        }

        if (appId) {
            window.location.href = `steam://rungameid/${appId}`;
            toast.success(`Launching ${gameTitle} on Steam...`);
            return;
        }
        navigate(`/game/${slug}`);
    };

    const handleQuickSync = async () => {
        if (syncingSteam) return;
        setSyncingSteam(true);
        try {
            const res = await axios.post(ENDPOINTS.STEAM.SYNC);
            toast.success(res.data?.message || "Steam library synced");
            setAchievementsMap({});
            await loadDashboard();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to sync Steam library");
        } finally {
            setSyncingSteam(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-pulse">
                <div className="h-14 rounded-2xl bg-primary-navy-dark" />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="h-56 rounded-2xl bg-primary-navy-dark" />
                    <div className="h-56 rounded-2xl bg-primary-navy-dark" />
                    <div className="h-56 rounded-2xl bg-primary-navy-dark" />
                    <div className="h-56 rounded-2xl bg-primary-navy-dark" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-[3/4] rounded-xl bg-primary-navy-dark"
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Vista de inicio para invitado
    if (!user) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                <div className="rounded-2xl bg-gradient-to-r from-primary-navy-dark via-primary-navy-light to-primary-navy-dark p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-xl">
                        <div className="flex items-center gap-2.5">
                            <img src={isotipo} alt="Stackd" className="w-7 h-7" />
                            <img src={logoStackd} alt="STACKD" className="h-5 w-auto" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            Your library, sessions, and reviews in one place.
                        </h1>
                        <p className="text-sm text-gray-400">
                            Sign in to sync your Steam account, track your sessions in real
                            time, and get tailored game recommendations.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => navigate("/login")}
                            className="px-5 py-2.5 rounded-xl bg-primary-yellow hover:bg-yellow-300 text-primary-navy font-bold text-sm flex items-center gap-2 transition cursor-pointer"
                        >
                            <LogIn className="w-4 h-4" />
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate("/explore")}
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
                        >
                            <Compass className="w-4 h-4 text-primary-cyan" />
                            Explore Catalog
                        </button>
                    </div>
                </div>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Popular Right Now</h2>
                        <Link
                            to="/explore"
                            className="text-xs font-semibold text-primary-yellow hover:underline flex items-center gap-1"
                        >
                            Browse full catalog <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                        {trendingGames.slice(0, 10).map((g) => (
                            <div
                                key={g.id}
                                onClick={() => navigate(`/game/${g.slug || g.id}`)}
                                className="group cursor-pointer"
                            >
                                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-primary-navy-dark ring-1 ring-white/10 group-hover:ring-primary-yellow transition">
                                    <img
                                        src={getGameCover(g)}
                                        alt={g.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                                    {g.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-7 space-y-8">
            {/* 1 · Banner recordatorio de Steam / Sincronización */}
            {steamStatus && !steamStatus.linked ? (
                <SteamLinkBanner prompt={steamPrompt} />
            ) : steamStatus?.linked ? (
                <div className="rounded-2xl bg-primary-navy-dark px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00adee]/15 text-[#00adee] grid place-items-center">
                            <SteamIcon className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-white">
                                Connected as{" "}
                                <span className="text-[#00adee]">
                                    {steamStatus.persona_name || "Steam"}
                                </span>
                            </p>
                            <p className="text-[11px] text-gray-400">
                                {steamStatus.last_sync_at
                                    ? `Last synced: ${new Date(
                                        steamStatus.last_sync_at
                                    ).toLocaleDateString()}`
                                    : "Ready to sync your library"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleQuickSync}
                        disabled={syncingSteam}
                        className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-200 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 text-primary-cyan ${syncingSteam ? "animate-spin" : ""
                                }`}
                        />
                        {syncingSteam ? "Syncing..." : "Sync Steam"}
                    </button>
                </div>
            ) : null}

            {/* 2 · Continue Playing (4 tarjetas compactas en grid 2x2) */}
            {continueCards.length > 0 ? (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-extrabold text-white tracking-tight">
                            Continue Playing
                        </h2>
                        <Link
                            to={`/profile/${user.username}/games`}
                            className="text-xs font-semibold text-primary-yellow hover:underline"
                        >
                            View full library ({userGames.length})
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        {continueCards.map((item) => {
                            const lastPlayedValue =
                                localRecentMap[String(item.igdb_game_id)] ||
                                item.last_played_at;
                            const linkedExe = getLinkedExecutable(item.igdb_game_id);
                            const cachedAch = achievementsMap[item.igdb_game_id];
                            const enrichedItem = cachedAch
                                ? {
                                    ...item,
                                    achievements_total: cachedAch.total,
                                    achievements_unlocked: cachedAch.unlocked,
                                }
                                : item;

                            return (
                                <ContinuePlayingCard
                                    key={item.id || item.igdb_game_id}
                                    item={enrichedItem}
                                    isRunning={isGameRunning(item)}
                                    lastPlayedValue={lastPlayedValue}
                                    linkedExe={linkedExe}
                                    onPlay={handleLaunchGame}
                                    onOpenSettings={setSettingsGame}
                                />
                            );
                        })}
                    </div>
                </section>
            ) : (
                <div className="rounded-2xl bg-primary-navy-dark border border-dashed border-white/10 p-8 text-center space-y-3">
                    <Gamepad2 className="w-10 h-10 text-gray-600 mx-auto" />
                    <h2 className="text-lg font-bold text-white">
                        Your library is empty
                    </h2>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Import your Steam library or browse the catalog to start tracking
                        your games.
                    </p>
                    <button
                        onClick={() => navigate("/explore")}
                        className="px-4 py-2 rounded-xl bg-primary-yellow text-primary-navy font-bold text-xs cursor-pointer"
                    >
                        Explore Games
                    </button>
                </div>
            )}

            {/* 3 · Ready to Play */}
            {readyToPlayGames.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-base font-bold text-white">
                                Ready to Play
                            </h2>
                            <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-300">
                                {readyToPlayGames.length}
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            Installed on this PC
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {readyToPlayGames.map((item) => {
                            const details = item.game_details || item;
                            const appId = Number(
                                item.steam_appid || details.steam_appid || 0
                            );
                            const isSteamInstalled =
                                appId > 0 && installedSteamIds.has(appId);

                            return (
                                <ReadyToPlayCard
                                    key={item.id || item.igdb_game_id}
                                    gameItem={item}
                                    isSteamInstalled={isSteamInstalled}
                                    isRunning={isGameRunning(item)}
                                    onPlay={handleLaunchGame}
                                    onOpenSettings={setSettingsGame}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {/* 4 · Recomendados para ti */}
            {recommendations.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Astroid className="w-4 h-4 text-primary-yellow" />
                            <h2 className="text-base font-bold text-white">
                                Recommended For You
                            </h2>
                        </div>
                        <Link
                            to="/recommendations"
                            className="text-xs font-semibold text-primary-yellow hover:underline"
                        >
                            See more →
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {recommendations.slice(0, 6).map((rec) => (
                            <div
                                key={rec.id}
                                onClick={() => navigate(`/game/${rec.slug || rec.id}`)}
                                className="group cursor-pointer"
                            >
                                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-primary-navy-dark transition">
                                    <img
                                        src={getGameCover(rec)}
                                        alt={rec.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {rec.match_percent && (
                                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/85 border border-primary-yellow/40 text-primary-yellow text-[10px] font-extrabold">
                                            {rec.match_percent}%
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                                    {rec.name}
                                </p>
                                {rec.reasons?.[0] && (
                                    <p className="text-[10px] text-gray-500 truncate">
                                        {rec.reasons[0]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <SteamImportModal
                isOpen={steamPrompt.importModalOpen}
                onClose={steamPrompt.closeImport}
                onImported={steamPrompt.handleImported}
            />
            <GameSettingsModal
                isOpen={Boolean(settingsGame)}
                onClose={() => setSettingsGame(null)}
                gameItem={activeSettingsGame}
                onUpdated={() => loadDashboard({ silent: true })}
            />
        </div>
    );
}