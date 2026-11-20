import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Play,
    Settings,
    Gamepad2,
    HardDrive,
    Archive,
    Check,
    ShoppingCart,
    Trash2,
    Library,
    FileCog,
} from "lucide-react";
import { getGameCover } from "../../utils/formatters";
import SteamIcon from "../../assets/steam-icon.svg?react";

function formatPlaytimeShort(minutes) {
    const total = Number(minutes) || 0;
    if (total <= 0) return "Not played";
    if (total < 60) return `${total}m`;

    const hrs = Math.floor(total / 60);
    const mins = total % 60;

    if (hrs >= 100 || mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
}

function formatRelativeTime(dateInput) {
    if (!dateInput) return "Never";
    const diffMs = Date.now() - new Date(dateInput).getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return "Just now";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(1, mins)} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
}

function getStatusMeta(status) {
    switch (status) {
        case "playing":
            return { label: "Playing", Icon: Play, color: "text-primary-cyan" };
        case "completed":
            return { label: "Completed", Icon: Check, color: "text-emerald-400" };
        case "backlog":
            return { label: "Backlog", Icon: Archive, color: "text-purple-400" };
        case "wishlist":
            return { label: "Wishlist", Icon: ShoppingCart, color: "text-sky-400" };
        case "dropped":
            return { label: "Dropped", Icon: Trash2, color: "text-rose-400" };
        default:
            return { label: "In Library", Icon: Library, color: "text-gray-400" };
    }
}

const ContinuePlayingCard = ({
    item,
    isRunning,
    lastPlayedValue,
    linkedExe,
    onPlay,
    onOpenSettings,
}) => {
    const navigate = useNavigate();

    const details = item.game_details || item;
    const slug = details.slug || item.slug || item.igdb_game_id;
    const title = details.name || item.name || "Untitled Game";

    const isSteam = Boolean(
        item.source === "steam" || item.steam_appid || details.steam_appid
    );

    const playtimeMins = Number(
        item.playtime_minutes ?? item.playtime_forever ?? 0
    );

    const achievementsTotal = Number(
        item.achievements_total ?? item.steam_achievements_total ?? 0
    );
    const achievementsUnlocked = Number(
        item.achievements_unlocked ?? item.steam_achievements_unlocked ?? 0
    );
    const hasAchievements = achievementsTotal > 0;
    const achievementPct = hasAchievements
        ? Math.min(100, Math.round((achievementsUnlocked / achievementsTotal) * 100))
        : 0;

    const { label: statusLabel, Icon: StatusIcon, color: statusColor } =
        getStatusMeta(item.status);

    return (
        <div className="rounded-2xl bg-primary-navy-dark p-4 flex items-stretch gap-4 transition-colors hover:bg-primary-navy-light">
            {/* Carátula vertical con badge limpio de plataforma */}
            <div
                onClick={() => navigate(`/game/${slug}`)}
                className="relative w-32 sm:w-36 aspect-[3/4] rounded-xl overflow-hidden bg-primary-navy shrink-0 cursor-pointer group"
            >
                <img
                    src={getGameCover(details)}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span
                    title={isSteam ? "Steam" : "Local"}
                    className="absolute bottom-2 left-2 w-7 h-7 rounded-lg bg-black/80 backdrop-blur-sm grid place-items-center text-white"
                >
                    {isSteam ? (
                        <SteamIcon className="w-4 h-4 fill-current" />
                    ) : (
                        <HardDrive className="w-3.5 h-3.5 text-gray-200" />
                    )}
                </span>
            </div>

            {/* Información y acciones */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="space-y-2">
                    {/* Título + indicador en vivo si está abierto */}
                    <div className="flex items-center gap-2">
                        <h3
                            onClick={() => navigate(`/game/${slug}`)}
                            title={title}
                            className="text-lg sm:text-xl font-extrabold text-white truncate cursor-pointer hover:text-primary-yellow transition-colors flex-1 min-w-0"
                        >
                            {title}
                        </h3>
                        {isRunning && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-cyan/15 text-primary-cyan text-[11px] font-semibold shrink-0">
                                <Gamepad2 className="w-3 h-3 animate-pulse" />
                                Live
                            </span>
                        )}
                    </div>

                    {/* Estado de biblioteca con icono */}
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
                        <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusColor}`} />
                        <span>{statusLabel}</span>
                    </div>

                    {/* Línea única unificada de metadatos */}
                    <p className="text-xs text-gray-400 truncate">
                        Time played:{" "}
                        <span className="text-gray-200 font-semibold tabular-nums">
                            {formatPlaytimeShort(playtimeMins)}
                        </span>
                        <span className="mx-1.5 text-gray-600">·</span>
                        Last played:{" "}
                        <span className="text-gray-200 font-semibold">
                            {lastPlayedValue ? formatRelativeTime(lastPlayedValue) : "Never"}
                        </span>
                    </p>

                    {/* Bloque inferior: Barra de logros (Steam) o info de ejecutable (Local) */}
                    {hasAchievements ? (
                        <div className="pt-1 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 font-medium">Achievements</span>
                                <span className="text-gray-200 font-bold tabular-nums">
                                    {achievementsUnlocked}/{achievementsTotal}
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary-cyan transition-all duration-300"
                                    style={{ width: `${achievementPct}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="pt-1 flex items-center gap-1.5 text-xs text-gray-400 truncate">
                            <FileCog className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="truncate">
                                {linkedExe?.fileName
                                    ? `${linkedExe.fileName}${linkedExe.verified ? " · Playtime tracked" : ""
                                    }`
                                    : isSteam
                                        ? "Steam library · No achievements"
                                        : "Local game"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Fila inferior: Botón principal Continue + Engranaje */}
                <div className="pt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onPlay?.(item)}
                        disabled={isRunning}
                        className={`flex-1 h-10 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${isRunning
                                ? "bg-primary-cyan/20 text-primary-cyan cursor-not-allowed"
                                : "bg-primary-yellow hover:bg-yellow-300 text-primary-navy cursor-pointer"
                            }`}
                    >
                        {isRunning ? (
                            <>
                                <Gamepad2 className="w-4 h-4 animate-pulse" />
                                <span>Running</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>Continue</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenSettings?.(item)}
                        title="Game settings"
                        aria-label="Game settings"
                        className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white grid place-items-center shrink-0 transition-colors cursor-pointer"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(ContinuePlayingCard);