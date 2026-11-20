import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
    FolderOpen,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    Trash2,
    X,
    FileCode2,
    ExternalLink,
    FolderSearch,
    Clock,
    Gamepad2,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../../api/axios";
import { ENDPOINTS } from "../../utils/constants";
import {
    getLinkedExecutable,
    setLinkedExecutable,
    removeLinkedExecutable,
} from "../../utils/localExecutables";
import SteamIcon from "../../assets/steam-icon.svg?react";

const STATUS_OPTIONS = [
    { value: "playing", label: "Playing" },
    { value: "completed", label: "Completed" },
    { value: "backlog", label: "Backlog" },
    { value: "wishlist", label: "Wishlist" },
    { value: "dropped", label: "Dropped" },
];

export default function ExecutableLinkModal({
    isOpen,
    onClose,
    gameItem,
    onUpdated,
}) {
    const navigate = useNavigate();
    const details = gameItem?.game_details || gameItem || {};
    const gameId = gameItem?.igdb_game_id || details?.id;
    const gameName = details?.name || gameItem?.name || "Game";
    const slug = details?.slug || gameItem?.slug || gameId;
    const steamAppId = gameItem?.steam_appid || details?.steam_appid;

    const [currentLink, setCurrentLink] = useState(null);
    const [status, setStatus] = useState(gameItem?.status || "playing");
    const [savingStatus, setSavingStatus] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        if (isOpen && gameItem) {
            setCurrentLink(getLinkedExecutable(gameId));
            setStatus(gameItem.status || "playing");
            setAnalysis(null);
        }
    }, [isOpen, gameItem, gameId]);

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

    const handleStatusChange = async (newStatus) => {
        if (newStatus === status || savingStatus) return;
        const prevStatus = status;
        setStatus(newStatus);
        setSavingStatus(true);
        try {
            await axios.put(ENDPOINTS.GAMES.UPDATE(gameId), {
                status: newStatus,
                rating: gameItem.rating ?? null,
            });
            toast.success(`Status updated to ${newStatus}`);
            onUpdated?.();
        } catch (err) {
            setStatus(prevStatus);
            toast.error(err.response?.data?.error || "Failed to update status");
        } finally {
            setSavingStatus(false);
        }
    };

    const handleBrowse = async () => {
        try {
            const selected = await open({
                multiple: false,
                title: `Select executable for ${gameName}`,
                filters: [{ name: "Windows Executable", extensions: ["exe"] }],
            });

            if (!selected) return;
            const exePath = Array.isArray(selected) ? selected[0] : selected;

            setValidating(true);
            const result = await invoke("validate_game_executable", {
                exePath,
                gameName,
                alternativeNames,
                developer,
            });

            setAnalysis(result);

            if (result.status === "verified") {
                setLinkedExecutable(gameId, {
                    exePath: result.exe_path,
                    fileName: result.file_name,
                    productName: result.product_name,
                    score: result.score,
                    verified: true,
                });
                setCurrentLink(getLinkedExecutable(gameId));
                toast.success(`Linked ${result.file_name} to ${gameName}`);
                onUpdated?.();
            }
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Failed to inspect executable");
        } finally {
            setValidating(false);
        }
    };

    const handleForceConfirm = () => {
        if (!analysis || analysis.status === "blocked") return;
        setLinkedExecutable(gameId, {
            exePath: analysis.exe_path,
            fileName: analysis.file_name,
            productName: analysis.product_name,
            score: analysis.score,
            verified: false,
        });
        setCurrentLink(getLinkedExecutable(gameId));
        setAnalysis(null);
        toast.success(`Linked ${analysis.file_name} (unverified — launch only)`);
        onUpdated?.();
    };

    const handleUnlink = () => {
        removeLinkedExecutable(gameId);
        setCurrentLink(null);
        setAnalysis(null);
        toast.success("Executable unlinked");
        onUpdated?.();
    };

    const handleRevealFolder = async () => {
        if (!currentLink?.exePath) return;
        try {
            await invoke("reveal_executable_in_explorer", {
                exePath: currentLink.exePath,
            });
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Folder not found");
        }
    };

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-primary-navy border border-white/10 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl space-y-5"
            >
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Cabecera */}
                <div className="pr-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-primary-yellow">
                            Game Quick Settings
                        </span>
                        {steamAppId && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#00adee]/15 text-[#00adee] text-[10px] font-bold">
                                <SteamIcon className="w-3 h-3 fill-current" />
                                Steam #{steamAppId}
                            </span>
                        )}
                    </div>
                    <h3 className="text-xl font-extrabold text-white mt-1 truncate">
                        {gameName}
                    </h3>
                </div>

                {/* 1 · Selector rápido de estado */}
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5 text-primary-yellow" />
                        Library Status
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 bg-primary-navy-dark p-1.5 rounded-xl border border-white/[0.06]">
                        {STATUS_OPTIONS.map((opt) => {
                            const active = status === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    disabled={savingStatus}
                                    onClick={() => handleStatusChange(opt.value)}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${active
                                        ? "bg-primary-yellow text-primary-navy shadow"
                                        : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2 · Ejecutable local vinculado */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                            Launch Executable (.exe)
                        </span>
                        {currentLink && (
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleRevealFolder}
                                    className="text-xs text-gray-300 hover:text-primary-cyan inline-flex items-center gap-1 font-semibold cursor-pointer"
                                >
                                    <FolderSearch className="w-3.5 h-3.5" />
                                    Open Folder
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUnlink}
                                    className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 font-semibold cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Unlink
                                </button>
                            </div>
                        )}
                    </div>

                    {currentLink ? (
                        <div className="rounded-xl bg-primary-navy-dark border border-white/10 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                {currentLink.verified ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-cyan">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Verified Executable ({currentLink.score}%)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                        <AlertTriangle className="w-4 h-4" />
                                        Unverified Executable (Launch only)
                                    </span>
                                )}

                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {currentLink.verified
                                        ? "Playtime tracking active"
                                        : "Playtime tracking disabled"}
                                </span>
                            </div>

                            <p className="text-xs font-mono text-gray-200 break-all bg-black/30 px-3 py-2 rounded-lg">
                                {currentLink.exePath}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl bg-primary-navy-dark/60 border border-dashed border-white/10 p-4 text-center space-y-1">
                            <FileCode2 className="w-6 h-6 text-gray-500 mx-auto" />
                            <p className="text-xs text-gray-300 font-medium">
                                {steamAppId
                                    ? "Launches via Steam by default"
                                    : "No local executable linked on this PC"}
                            </p>
                            <p className="text-[11px] text-gray-500">
                                {steamAppId
                                    ? "Optionally link a custom .exe (e.g. mod launcher) to override Steam."
                                    : "Select the game's .exe file to enable one-click launch and playtime tracking."}
                            </p>
                        </div>
                    )}
                </div>

                {/* 3 · Resultado del análisis PE */}
                {analysis && (
                    <div
                        className={`rounded-xl border p-4 space-y-2.5 ${analysis.status === "blocked"
                            ? "bg-rose-500/10 border-rose-500/30"
                            : analysis.status === "warning"
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-emerald-500/10 border-emerald-500/30"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            {analysis.status === "blocked" && (
                                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                            )}
                            {analysis.status === "warning" && (
                                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                            )}
                            {analysis.status === "verified" && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                {analysis.status === "blocked"
                                    ? "Executable Rejected"
                                    : analysis.status === "warning"
                                        ? `Low Match Confidence (${analysis.score}%)`
                                        : `Verified Match (${analysis.score}%)`}
                            </span>
                        </div>

                        <p className="text-xs text-gray-200 leading-relaxed">
                            {analysis.reason}
                        </p>

                        {(analysis.product_name || analysis.company_name) && (
                            <div className="text-[11px] text-gray-400 bg-black/25 rounded-lg p-2.5 space-y-0.5">
                                {analysis.product_name && (
                                    <p>
                                        Product Name:{" "}
                                        <span className="text-gray-200">{analysis.product_name}</span>
                                    </p>
                                )}
                                {analysis.company_name && (
                                    <p>
                                        Publisher / Developer:{" "}
                                        <span className="text-gray-200">{analysis.company_name}</span>
                                    </p>
                                )}
                                <p>
                                    Folder:{" "}
                                    <span className="text-gray-200">{analysis.parent_folder}</span>
                                </p>
                            </div>
                        )}

                        {analysis.status === "warning" && (
                            <div className="pt-1 flex items-center justify-between gap-2">
                                <span className="text-[11px] text-amber-300/90">
                                    Playtime will not be counted for unverified executables.
                                </span>
                                <button
                                    type="button"
                                    onClick={handleForceConfirm}
                                    className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-primary-navy font-bold text-xs shrink-0 cursor-pointer"
                                >
                                    Link Anyway
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Pie: Ver ficha + Seleccionar .exe */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.07]">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            navigate(`/game/${slug}`);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-primary-cyan" />
                        View Game Page
                    </button>

                    <button
                        type="button"
                        onClick={handleBrowse}
                        disabled={validating}
                        className="px-4 py-2 rounded-xl bg-primary-yellow hover:bg-yellow-300 text-primary-navy font-bold text-xs inline-flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                        <FolderOpen className="w-4 h-4" />
                        {validating
                            ? "Inspecting..."
                            : currentLink
                                ? "Change Executable"
                                : "Browse .exe"}
                    </button>
                </div>
            </div>
        </div>
    );
}