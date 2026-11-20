import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import toast from "react-hot-toast";
import {
    Monitor,
    Power,
    PanelBottomClose,
    FolderOpen,
    Trash2,
    ShieldCheck,
    Play,
    Gamepad2,
} from "lucide-react";
import axios from "../../api/axios";
import { ENDPOINTS } from "../../utils/constants";
import {
    getAllLinkedExecutables,
    removeLinkedExecutable,
} from "../../utils/localExecutables";
import {
    isTauriDesktop,
    getMinimizeToTrayPreference,
    setMinimizeToTrayPreference,
} from "../../utils/desktopPreferences";

const DesktopSettingsCard = () => {
    const [autostartEnabled, setAutostartEnabled] = useState(false);
    const [autostartLoading, setAutostartLoading] = useState(true);
    const [minimizeToTray, setMinimizeToTray] = useState(() =>
        getMinimizeToTrayPreference()
    );
    const [linkedItems, setLinkedItems] = useState([]);

    const loadLinkedGames = async () => {
        const rawMap = getAllLinkedExecutables();
        const entries = Object.entries(rawMap);

        if (entries.length === 0) {
            setLinkedItems([]);
            return;
        }

        // Obtener nombres de juegos de la biblioteca para mostrar títulos legibles
        let namesById = new Map();
        try {
            const res = await axios.get(ENDPOINTS.GAMES.USER_GAMES);
            const list = Array.isArray(res.data) ? res.data : res.data?.games || [];
            list.forEach((g) => {
                namesById.set(
                    String(g.igdb_game_id),
                    g.name || g.game_details?.name || `Game #${g.igdb_game_id}`
                );
            });
        } catch {
            // Fallback al nombre del ejecutable si no hay red
        }

        const formatted = entries.map(([igdbId, info]) => ({
            igdbId,
            gameName: namesById.get(igdbId) || info.fileName || `Game #${igdbId}`,
            fileName: info.fileName || "Unknown executable",
            exePath: info.exePath || "",
            verified: Boolean(info.verified),
        }));

        setLinkedItems(formatted);
    };

    useEffect(() => {
        if (!isTauriDesktop()) return;

        isEnabled()
            .then((val) => setAutostartEnabled(Boolean(val)))
            .catch(() => setAutostartEnabled(false))
            .finally(() => setAutostartLoading(false));

        loadLinkedGames();
    }, []);

    if (!isTauriDesktop()) return null;

    const handleToggleAutostart = async () => {
        setAutostartLoading(true);
        try {
            if (autostartEnabled) {
                await disable();
                setAutostartEnabled(false);
                toast.success("Windows autostart disabled");
            } else {
                await enable();
                setAutostartEnabled(true);
                toast.success("Stackd will start automatically with Windows");
            }
        } catch {
            toast.error("Could not update Windows startup setting");
        } finally {
            setAutostartLoading(false);
        }
    };

    const handleToggleMinimizeToTray = async () => {
        const next = !minimizeToTray;
        setMinimizeToTray(next);
        await setMinimizeToTrayPreference(next);
        toast.success(
            next
                ? "Closing window will minimize Stackd to system tray"
                : "Closing window will exit Stackd"
        );
    };

    const handleRevealExe = async (exePath) => {
        if (!exePath) return;
        try {
            await invoke("reveal_executable_in_explorer", { exePath });
        } catch {
            toast.error("Could not open executable folder");
        }
    };

    const handleUnlinkExe = (igdbId, gameName) => {
        removeLinkedExecutable(igdbId);
        setLinkedItems((prev) => prev.filter((item) => item.igdbId !== igdbId));
        window.dispatchEvent(new Event("stackd:library-updated"));
        toast.success(`Unlinked executable for ${gameName}`);
    };

    return (
        <div className="bg-primary-navy-dark rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Cabecera */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-cyan/15 rounded-xl text-primary-cyan">
                    <Monitor size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Desktop & Session Tracking</h2>
                    <p className="text-xs sm:text-sm text-gray-400">
                        Configure background behavior, Windows startup, and linked local executables
                    </p>
                </div>
            </div>

            {/* Interruptores de comportamiento */}
            <div className="divide-y divide-white/5 rounded-xl bg-primary-navy/60 overflow-hidden">
                {/* Autostart con Windows */}
                <div className="p-4 sm:px-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-300 shrink-0 mt-0.5">
                            <Power size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">
                                Start with Windows
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Launch Stackd silently in the system tray when you sign in to Windows so sessions are always tracked.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleToggleAutostart}
                        disabled={autostartLoading}
                        aria-label="Toggle Windows Autostart"
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 cursor-pointer ${autostartEnabled ? "bg-primary-yellow" : "bg-gray-700"
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${autostartEnabled ? "translate-x-6" : "translate-x-1"
                                }`}
                        />
                    </button>
                </div>

                {/* Minimizar al tray al cerrar */}
                <div className="p-4 sm:px-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-300 shrink-0 mt-0.5">
                            <PanelBottomClose size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">
                                Minimize to system tray on close
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Keep Stackd running in the background when clicking the close button (X) to avoid interrupting active game tracking.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleToggleMinimizeToTray}
                        aria-label="Toggle Minimize to System Tray"
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${minimizeToTray ? "bg-primary-yellow" : "bg-gray-700"
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${minimizeToTray ? "translate-x-6" : "translate-x-1"
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Gestor de ejecutables locales vinculados */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Linked Local Executables ({linkedItems.length})
                    </h3>
                </div>

                {linkedItems.length === 0 ? (
                    <div className="rounded-xl bg-primary-navy/50 p-5 text-center space-y-1.5">
                        <Gamepad2 className="w-6 h-6 text-gray-500 mx-auto" />
                        <p className="text-xs font-medium text-gray-300">
                            No local executables linked yet
                        </p>
                        <p className="text-[11px] text-gray-500">
                            Open any game’s settings modal from your library to link its .exe file.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 rounded-xl bg-primary-navy/60 overflow-hidden">
                        {linkedItems.map((item) => (
                            <div
                                key={item.igdbId}
                                className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-white truncate">
                                            {item.gameName}
                                        </span>
                                        {item.verified ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                                                <ShieldCheck size={11} />
                                                Verified · Tracking
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
                                                <Play size={11} />
                                                Launch only
                                            </span>
                                        )}
                                    </div>
                                    <p
                                        title={item.exePath}
                                        className="text-xs text-gray-400 truncate mt-0.5 font-mono"
                                    >
                                        {item.exePath}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleRevealExe(item.exePath)}
                                        title="Show in Explorer"
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <FolderOpen size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUnlinkExe(item.igdbId, item.gameName)}
                                        title="Unlink executable"
                                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DesktopSettingsCard;