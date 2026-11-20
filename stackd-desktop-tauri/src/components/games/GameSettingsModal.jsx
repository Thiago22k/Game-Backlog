import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
    X,
    FolderCog,
    Library,
    FileCog,
    FileQuestion,
    FolderSearch,
    FolderOpen,
    Unlink,
    Archive,
    Play,
    ShoppingCart,
    Check,
    Trash2,
    ExternalLink,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../../api/axios";
import { ENDPOINTS } from "../../utils/constants";
import { getGameCover } from "../../utils/formatters";
import {
    getLinkedExecutable,
    setLinkedExecutable,
    removeLinkedExecutable,
} from "../../utils/localExecutables";

const STATUSES = [
    {
        id: "backlog",
        label: "Backlog",
        icon: Archive,
        desc: "Queued to play later",
    },
    {
        id: "playing",
        label: "Playing",
        icon: Play,
        desc: "Currently playing",
    },
    {
        id: "completed",
        label: "Completed",
        icon: Check,
        desc: "Finished",
    },
    {
        id: "wishlist",
        label: "Wishlist",
        icon: ShoppingCart,
        desc: "Want to play or own",
    },
    {
        id: "dropped",
        label: "Dropped",
        icon: Trash2,
        desc: "Stopped playing",
    },
];

const SECTIONS = [
    { id: "exe", label: "Executable", icon: FolderCog },
    { id: "status", label: "My Status", icon: Library },
];

export default function GameSettingsModal({
    isOpen,
    onClose,
    gameItem,
    onUpdated,
}) {
    const navigate = useNavigate();
    const dlgRef = useRef(null);
    const closeBtnRef = useRef(null);
    const wasOpenRef = useRef(false);

    const details = gameItem?.game_details || gameItem || {};
    const gameId = gameItem?.igdb_game_id || details?.id;
    const gameName = details?.name || gameItem?.name || "Game";
    const slug = details?.slug || gameItem?.slug || gameId;

    const [tab, setTab] = useState("exe");
    const [status, setStatus] = useState(gameItem?.status || "playing");
    const [savingStatus, setSavingStatus] = useState(false);
    const [linkedExe, setLinkedExe] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // "exe" | "lib" | null
    const [pendingWarning, setPendingWarning] = useState(null);
    const [blockedReason, setBlockedReason] = useState(null);
    const [validating, setValidating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [steamInstallPath, setSteamInstallPath] = useState(null);

    // 1. Solo reiniciar pestaña y confirmaciones cuando isOpen pasa de false -> true
    useEffect(() => {
        const justOpened = isOpen && !wasOpenRef.current;
        wasOpenRef.current = isOpen;

        if (!isOpen) {
            document.body.style.overflow = "";
            return;
        }

        if (justOpened) {
            setTab("exe");
            setConfirmAction(null);
            setPendingWarning(null);
            setBlockedReason(null);
            setLinkedExe(getLinkedExecutable(gameId));

            const appId = Number(gameItem?.steam_appid || details?.steam_appid || 0);
            if (appId > 0) {
                invoke("get_installed_steam_games")
                    .then((games) => {
                        const found = Array.isArray(games)
                            ? games.find((g) => Number(g.appid) === appId)
                            : null;
                        setSteamInstallPath(found?.install_path || null);
                    })
                    .catch(() => setSteamInstallPath(null));
            } else {
                setSteamInstallPath(null);
            }

            document.body.style.overflow = "hidden";
            const t = setTimeout(() => closeBtnRef.current?.focus(), 20);
            return () => clearTimeout(t);
        }
    }, [isOpen, gameId, gameItem?.steam_appid, details?.steam_appid]);

    // 2. Sincronizar el status externo solo si cambia desde fuera y no estamos guardando
    useEffect(() => {
        if (isOpen && gameItem?.status && !savingStatus) {
            setStatus(gameItem.status);
        }
    }, [isOpen, gameItem?.status, savingStatus]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                if (confirmAction) {
                    setConfirmAction(null);
                } else {
                    onClose();
                }
                return;
            }

            if (
                document.activeElement?.getAttribute("role") === "tab" &&
                ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)
            ) {
                e.preventDefault();
                const idx = SECTIONS.findIndex((s) => s.id === tab);
                const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
                const next = SECTIONS[(idx + dir + SECTIONS.length) % SECTIONS.length];
                setTab(next.id);
                setConfirmAction(null);
                setTimeout(() => {
                    document.getElementById(`tab-${next.id}`)?.focus();
                }, 0);
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isOpen, confirmAction, tab, onClose]);

    if (!isOpen || !gameItem) return null;

    const developer =
        details?.involved_companies
            ?.filter((ic) => ic.developer)
            .map((ic) => ic.company?.name)
            .filter(Boolean)
            .join(", ") || null;

    const alternativeNames = Array.isArray(details?.alternative_names)
        ? details.alternative_names.map((a) => a.name).filter(Boolean)
        : [];

    const handlePickExe = async () => {
        try {
            const selected = await open({
                multiple: false,
                title: `Select executable for ${gameName}`,
                filters: [{ name: "Windows Executable", extensions: ["exe"] }],
            });
            if (!selected) return;
            const exePath = Array.isArray(selected) ? selected[0] : selected;

            setValidating(true);
            setPendingWarning(null);
            setBlockedReason(null);
            setConfirmAction(null);

            const result = await invoke("validate_game_executable", {
                exePath,
                gameName,
                alternativeNames,
                developer,
            });

            if (result.status === "blocked") {
                setBlockedReason(
                    result.reason || "System and non-game applications are not allowed."
                );
                return;
            }

            if (result.status === "verified") {
                setLinkedExecutable(gameId, {
                    exePath: result.exe_path,
                    fileName: result.file_name,
                    productName: result.product_name,
                    score: result.score,
                    verified: true,
                });
                setLinkedExe(getLinkedExecutable(gameId));
                toast.success(`Executable updated (${result.score}% match)`);
                onUpdated?.();
                return;
            }

            setPendingWarning(result);
        } catch (err) {
            toast.error(
                typeof err === "string" ? err : "Failed to inspect executable"
            );
        } finally {
            setValidating(false);
        }
    };

    const handleConfirmWarning = () => {
        if (!pendingWarning) return;
        setLinkedExecutable(gameId, {
            exePath: pendingWarning.exe_path,
            fileName: pendingWarning.file_name,
            productName: pendingWarning.product_name,
            score: pendingWarning.score,
            verified: false,
        });
        setLinkedExe(getLinkedExecutable(gameId));
        setPendingWarning(null);
        toast.success("Executable linked (launch only)");
        onUpdated?.();
    };

    const handleOpenFolder = async () => {
        try {
            if (linkedExe?.exePath) {
                await invoke("reveal_executable_in_explorer", {
                    exePath: linkedExe.exePath,
                });
                return;
            }
            if (steamInstallPath) {
                await invoke("open_folder_in_explorer", {
                    folderPath: steamInstallPath,
                });
            }
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Folder not found");
        }
    };

    const handleConfirmRemoveExe = () => {
        removeLinkedExecutable(gameId);
        setLinkedExe(null);
        setConfirmAction(null);
        setPendingWarning(null);
        setBlockedReason(null);
        toast.success("Executable unlinked");
        onUpdated?.();
    };

    const handleStatusChange = async (newStatus) => {
        if (newStatus === status || savingStatus) return;
        const prev = status;
        setStatus(newStatus);
        setSavingStatus(true);
        try {
            await axios.put(ENDPOINTS.GAMES.UPDATE(gameId), {
                status: newStatus,
                rating: gameItem.rating ?? null,
            });
            const label =
                STATUSES.find((s) => s.id === newStatus)?.label || newStatus;
            toast.success(`Status: ${label}`);
            window.dispatchEvent(new Event("stackd:library-updated"));
            onUpdated?.();
        } catch (err) {
            setStatus(prev);
            toast.error(err.response?.data?.error || "Failed to update status");
        } finally {
            setSavingStatus(false);
        }
    };

    const handleConfirmRemoveLib = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await axios.delete(ENDPOINTS.GAMES.UPDATE(gameId));
            removeLinkedExecutable(gameId);
            toast.success(`${gameName} removed from your library`);
            window.dispatchEvent(new Event("stackd:library-updated"));
            onClose();
            onUpdated?.();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to remove game");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-[300] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
            <div
                ref={dlgRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dlgTitle"
                className="flex h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-primary-navy text-white shadow-2xl shadow-black/70 sm:h-[620px] sm:rounded-3xl"
            >
                {/* Cabecera: contexto del juego */}
                <header className="flex items-center gap-4 px-5 pb-4 pt-5 sm:px-6">
                    <div className="h-14 w-11 shrink-0 overflow-hidden rounded-xl bg-primary-navy-dark">
                        <img
                            src={getGameCover(details)}
                            alt={gameName}
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                            Game Settings
                        </p>
                        <h2 id="dlgTitle" className="truncate text-xl font-extrabold">
                            {gameName}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            navigate(`/game/${slug}`);
                        }}
                        className="hidden h-10 items-center gap-2 rounded-xl bg-white/[0.06] px-3.5 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/[0.12] hover:text-white sm:flex cursor-pointer"
                    >
                        <ExternalLink className="h-4 w-4 text-primary-cyan" />
                        Game Page
                    </button>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close settings"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-gray-400 transition-colors hover:bg-white/[0.07] hover:text-white cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {/* Cuerpo: navegación lateral + panel activo */}
                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                    {/* Navegación de secciones */}
                    <div
                        role="tablist"
                        aria-label="Settings sections"
                        aria-orientation="vertical"
                        className="flex shrink-0 gap-1 overflow-x-auto px-4 pb-3 sm:w-52 sm:flex-col sm:overflow-visible sm:px-4 sm:pb-0"
                    >
                        {SECTIONS.map((s) => {
                            const Icon = s.icon;
                            const active = tab === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="tab"
                                    id={`tab-${s.id}`}
                                    aria-selected={active}
                                    aria-controls="panel"
                                    tabIndex={active ? 0 : -1}
                                    onClick={() => {
                                        setTab(s.id);
                                        setConfirmAction(null);
                                    }}
                                    className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors cursor-pointer ${active
                                        ? "bg-primary-yellow text-primary-navy"
                                        : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
                                        }`}
                                >
                                    <Icon className="h-[18px] w-[18px]" />
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Contenido de la pestaña */}
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-1 sm:px-6 sm:pt-0">
                        <div
                            role="tabpanel"
                            id="panel"
                            aria-labelledby={`tab-${tab}`}
                            tabIndex={0}
                        >
                            {tab === "exe" ? (
                                <div>
                                    <h3 className="text-base font-bold text-white">Executable</h3>
                                    <p className="mt-1 text-sm text-gray-400">
                                        Choose which file launches this game and open its
                                        installation folder.
                                    </p>

                                    {/* Tarjeta del archivo actual */}
                                    <div className="mt-5 rounded-2xl bg-primary-navy-dark p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                                Current File
                                            </p>
                                            {linkedExe && (
                                                <span
                                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${linkedExe.verified
                                                        ? "text-primary-cyan"
                                                        : "text-amber-400"
                                                        }`}
                                                >
                                                    {linkedExe.verified ? (
                                                        <>
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Verified · Playtime tracked
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                            Unverified · Launch only
                                                        </>
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {linkedExe ? (
                                            <div className="mt-2.5 flex items-center gap-3">
                                                <FileCog className="h-5 w-5 shrink-0 text-primary-yellow" />
                                                <p
                                                    className="min-w-0 break-all font-mono text-[13px] leading-relaxed text-gray-100"
                                                    title={linkedExe.exePath}
                                                >
                                                    {linkedExe.exePath}
                                                </p>
                                            </div>
                                        ) : steamInstallPath ? (
                                            <div className="mt-2.5 flex items-center gap-3">
                                                <FolderOpen className="h-5 w-5 shrink-0 text-primary-cyan" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-semibold text-primary-cyan">
                                                        Steam installation folder
                                                    </p>
                                                    <p
                                                        className="min-w-0 break-all font-mono text-[13px] leading-relaxed text-gray-100"
                                                        title={steamInstallPath}
                                                    >
                                                        {steamInstallPath}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2.5 flex items-center gap-3 text-gray-400">
                                                <FileQuestion className="h-5 w-5 shrink-0" />
                                                <p className="text-sm">
                                                    No executable assigned yet. Pick one to launch the
                                                    game directly from Stackd.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Aviso si el ejecutable fue rechazado */}
                                    {blockedReason && (
                                        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-rose-500/15 p-4 text-rose-200">
                                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                                            <div className="text-sm">
                                                <p className="font-semibold text-white">
                                                    Executable rejected
                                                </p>
                                                <p className="mt-0.5 text-xs text-rose-200/90">
                                                    {blockedReason}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Confirmación si dio baja confianza (warning) */}
                                    {pendingWarning && (
                                        <div className="mt-4 rounded-2xl bg-amber-500/15 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-white">
                                                        Low match confidence ({pendingWarning.score}%)
                                                    </p>
                                                    <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
                                                        {pendingWarning.reason} Playtime will not be
                                                        counted if you link it anyway.
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingWarning(null)}
                                                            className="flex h-10 items-center justify-center rounded-xl bg-white/[0.08] px-4 text-xs font-semibold text-white transition-colors hover:bg-white/[0.14] cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleConfirmWarning}
                                                            className="flex h-10 items-center justify-center rounded-xl bg-amber-400 px-4 text-xs font-bold text-primary-navy transition-colors hover:bg-amber-300 cursor-pointer"
                                                        >
                                                            Link Anyway
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Botones principales */}
                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            disabled={validating}
                                            onClick={handlePickExe}
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-yellow px-4 text-sm font-bold text-primary-navy transition-colors hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
                                        >
                                            <FolderSearch className="h-[18px] w-[18px]" />
                                            {validating
                                                ? "Inspecting..."
                                                : linkedExe
                                                    ? "Change executable"
                                                    : "Choose executable"}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!linkedExe && !steamInstallPath}
                                            onClick={handleOpenFolder}
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.07] cursor-pointer"
                                        >
                                            <FolderOpen className="h-[18px] w-[18px]" />
                                            Open game folder
                                        </button>
                                    </div>

                                    {/* Acción de desvincular (separada por espacio limpio, sin línea) */}
                                    <div className="mt-8">
                                        {confirmAction === "exe" ? (
                                            <div
                                                role="alertdialog"
                                                aria-labelledby="cfExeTitle"
                                                className="rounded-2xl bg-primary-navy-dark p-4"
                                            >
                                                <p id="cfExeTitle" className="text-sm font-semibold">
                                                    Unlink this executable?
                                                </p>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    It will only be unlinked from Stackd. The file will
                                                    not be deleted from your PC.
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmAction(null)}
                                                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-4 text-sm font-medium transition-colors hover:bg-white/[0.12] cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleConfirmRemoveExe}
                                                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-400 cursor-pointer"
                                                    >
                                                        Yes, unlink
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={!linkedExe}
                                                onClick={() => setConfirmAction("exe")}
                                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-4 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.07] sm:w-auto cursor-pointer"
                                            >
                                                <Unlink className="h-[18px] w-[18px]" />
                                                Unlink executable
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-base font-bold text-white">My Status</h3>
                                    <p className="mt-1 text-sm text-gray-400">
                                        Set where this game stands in your library. Changes save
                                        instantly.
                                    </p>

                                    {/* Selector de estado en tarjetas limpias */}
                                    <fieldset className="mt-5">
                                        <legend className="sr-only">Game status</legend>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {STATUSES.map((s) => {
                                                const Icon = s.icon;
                                                const checked = status === s.id;
                                                return (
                                                    <label
                                                        key={s.id}
                                                        className="relative block cursor-pointer"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="game_status"
                                                            value={s.id}
                                                            checked={checked}
                                                            disabled={savingStatus}
                                                            onChange={() => handleStatusChange(s.id)}
                                                            className="peer sr-only"
                                                        />
                                                        <span
                                                            className={`flex min-h-[60px] items-center gap-3 rounded-2xl p-3 transition-colors ${checked
                                                                ? "bg-primary-yellow text-primary-navy"
                                                                : "bg-primary-navy-dark text-gray-400 hover:bg-primary-navy-light hover:text-white"
                                                                }`}
                                                        >
                                                            <Icon className="h-5 w-5 shrink-0" />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block text-sm font-bold">
                                                                    {s.label}
                                                                </span>
                                                                <span className="block truncate text-xs opacity-80">
                                                                    {s.desc}
                                                                </span>
                                                            </span>
                                                            <Check
                                                                className={`h-4 w-4 shrink-0 ${checked ? "opacity-100" : "opacity-0"
                                                                    }`}
                                                            />
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </fieldset>

                                    {/* Zona de peligro sin borde superior */}
                                    <div className="mt-8">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-400">
                                            Danger Zone
                                        </p>
                                        {confirmAction === "lib" ? (
                                            <div
                                                role="alertdialog"
                                                aria-labelledby="cfLibTitle"
                                                className="mt-3 rounded-2xl bg-primary-navy-dark p-4"
                                            >
                                                <p id="cfLibTitle" className="text-sm font-semibold">
                                                    Remove {gameName} from your library?
                                                </p>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    You will lose its status, rating, and tracked
                                                    playtime. This action cannot be undone.
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmAction(null)}
                                                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-4 text-sm font-medium transition-colors hover:bg-white/[0.12] cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={deleting}
                                                        onClick={handleConfirmRemoveLib}
                                                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-400 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {deleting ? "Removing..." : "Yes, remove"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-sm text-gray-400">
                                                    Permanently remove this game from your library.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmAction("lib")}
                                                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-4 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/15 cursor-pointer"
                                                >
                                                    <Trash2 className="h-[18px] w-[18px]" />
                                                    Remove from library
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}