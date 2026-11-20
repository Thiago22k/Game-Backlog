import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
    FolderOpen,
    FolderSearch,
    Trash2,
    ExternalLink,
    CheckCircle2,
    AlertTriangle,
    Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../../api/axios";
import { ENDPOINTS } from "../../utils/constants";
import {
    getLinkedExecutable,
    setLinkedExecutable,
    removeLinkedExecutable,
} from "../../utils/localExecutables";

const STATUS_OPTIONS = [
    { value: "playing", label: "Playing" },
    { value: "completed", label: "Completed" },
    { value: "backlog", label: "Backlog" },
    { value: "wishlist", label: "Wishlist" },
    { value: "dropped", label: "Dropped" },
];

export default function GameCardMenu({ gameItem, onUpdated }) {
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const details = gameItem?.game_details || gameItem || {};
    const gameId = gameItem?.igdb_game_id || details?.id;
    const gameName = details?.name || gameItem?.name || "Game";
    const slug = details?.slug || gameItem?.slug || gameId;

    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState(gameItem?.status || "playing");
    const [savingStatus, setSavingStatus] = useState(false);
    const [linkedExe, setLinkedExe] = useState(() =>
        getLinkedExecutable(gameId)
    );
    const [pendingWarning, setPendingWarning] = useState(null);
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        setStatus(gameItem?.status || "playing");
        setLinkedExe(getLinkedExecutable(gameId));
    }, [gameItem, gameId, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
                setPendingWarning(null);
            }
        };
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                setPendingWarning(null);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [isOpen]);

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
        const prev = status;
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
            setStatus(prev);
            toast.error(err.response?.data?.error || "Failed to update status");
        } finally {
            setSavingStatus(false);
        }
    };

    const handleBrowseExe = async () => {
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

            const result = await invoke("validate_game_executable", {
                exePath,
                gameName,
                alternativeNames,
                developer,
            });

            if (result.status === "blocked") {
                toast.error(result.reason || "Executable rejected");
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
                toast.success(`Linked ${result.file_name} (${result.score}% match)`);
                onUpdated?.();
                return;
            }

            setPendingWarning(result);
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Failed to inspect file");
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
        toast.success(`Linked ${pendingWarning.file_name} (launch only)`);
        onUpdated?.();
    };

    const handleUnlink = () => {
        removeLinkedExecutable(gameId);
        setLinkedExe(null);
        setPendingWarning(null);
        toast.success("Executable unlinked");
        onUpdated?.();
    };

    const handleRevealFolder = async () => {
        if (!linkedExe?.exePath) return;
        try {
            await invoke("reveal_executable_in_explorer", {
                exePath: linkedExe.exePath,
            });
            setIsOpen(false);
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Folder not found");
        }
    };

    return (
        <div ref={menuRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                title="Game options"
                aria-label="Game options"
                className={`w-10 h-10 rounded-xl grid place-items-center transition cursor-pointer ${isOpen
                    ? "bg-primary-navy text-white"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white"
                    }`}
            >
                <Settings className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-12 z-50 w-64 rounded-2xl bg-primary-navy shadow-2xl p-2 space-y-2.5 text-left">
                    {/* Estado */}
                    <div className="px-2 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                            Status
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {STATUS_OPTIONS.map((opt) => {
                                const active = status === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={savingStatus}
                                        onClick={() => handleStatusChange(opt.value)}
                                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${active
                                            ? "bg-primary-yellow text-primary-navy font-bold"
                                            : "bg-primary-navy-dark hover:bg-white/[0.08] text-gray-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ejecutable vinculado (si existe) */}
                    {linkedExe && (
                        <div className="px-2.5 py-2 rounded-xl bg-primary-navy-dark space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white truncate">
                                {linkedExe.verified ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-cyan shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                )}
                                <span className="truncate" title={linkedExe.exePath}>
                                    {linkedExe.fileName}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 pl-5">
                                {linkedExe.verified
                                    ? "Verified · Playtime tracked"
                                    : "Unverified · Launch only"}
                            </p>
                        </div>
                    )}

                    {/* Confirmación compacta en warning */}
                    {pendingWarning && (
                        <div className="p-2.5 rounded-xl bg-amber-500/15 space-y-2">
                            <p className="text-[11px] text-amber-200 leading-snug">
                                Low match ({pendingWarning.score}%) for{" "}
                                <span className="font-semibold">
                                    {pendingWarning.file_name}
                                </span>
                                . Playtime won't be tracked.
                            </p>
                            <div className="flex items-center justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPendingWarning(null)}
                                    className="px-2 py-1 rounded-lg text-[11px] text-gray-300 hover:bg-white/10 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmWarning}
                                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-primary-navy font-bold text-[11px] cursor-pointer"
                                >
                                    Link Anyway
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Acciones del menú */}
                    <div className="space-y-0.5">
                        <button
                            type="button"
                            onClick={handleBrowseExe}
                            disabled={validating}
                            className="w-full px-2.5 py-2 rounded-xl hover:bg-white/[0.08] text-xs font-medium text-gray-200 flex items-center gap-2.5 transition disabled:opacity-50 cursor-pointer"
                        >
                            <FolderOpen className="w-4 h-4 text-primary-yellow shrink-0" />
                            {validating
                                ? "Inspecting..."
                                : linkedExe
                                    ? "Change .exe"
                                    : "Link local .exe"}
                        </button>

                        {linkedExe && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleRevealFolder}
                                    className="w-full px-2.5 py-2 rounded-xl hover:bg-white/[0.08] text-xs font-medium text-gray-200 flex items-center gap-2.5 transition cursor-pointer"
                                >
                                    <FolderSearch className="w-4 h-4 text-primary-cyan shrink-0" />
                                    Open folder
                                </button>

                                <button
                                    type="button"
                                    onClick={handleUnlink}
                                    className="w-full px-2.5 py-2 rounded-xl hover:bg-rose-500/15 text-xs font-medium text-rose-400 flex items-center gap-2.5 transition cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4 shrink-0" />
                                    Unlink .exe
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                navigate(`/game/${slug}`);
                            }}
                            className="w-full px-2.5 py-2 rounded-xl hover:bg-white/[0.08] text-xs font-medium text-gray-200 flex items-center gap-2.5 transition cursor-pointer"
                        >
                            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                            View game page
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}