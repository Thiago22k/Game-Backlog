import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Play,
    Settings,
    Clock,
    HardDriveDownload,
    Gamepad2,
} from "lucide-react";
import {
    getGameCover,
    formatIGDBImage,
    PLACEHOLDER_COVER,
} from "../../utils/formatters";

function formatPlayedLabel(minutes) {
    const total = Number(minutes) || 0;
    if (total <= 0) return "Not played";
    if (total < 60) return `${total} m played`;
    const hrs = Math.floor(total / 60);
    const mins = total % 60;
    if (hrs >= 10 || mins === 0) return `${hrs} h played`;
    return `${hrs}h ${mins}m played`;
}

const ReadyToPlayCard = ({
    gameItem,
    isSteamInstalled,
    isRunning,
    onPlay,
    onOpenSettings,
}) => {
    const navigate = useNavigate();

    const details = gameItem?.game_details || gameItem || {};
    const slug = details.slug || gameItem?.slug || gameItem?.igdb_game_id;
    const title = details.name || gameItem?.name || "Untitled Game";

    const rawArtwork =
        details.artworks?.[0]?.url ||
        details.screenshots?.[0]?.url ||
        details.cover?.url;
    const artworkUrl = rawArtwork
        ? formatIGDBImage(rawArtwork)
        : getGameCover(details);

    const coverUrl = getGameCover(details);
    const playtimeMins = Number(
        gameItem?.playtime_minutes ?? gameItem?.playtime_forever ?? 0
    );

    return (
        <div
            onClick={() => navigate(`/game/${slug}`)}
            className="bg-primary-navy-dark rounded-2xl overflow-hidden hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 cursor-pointer group h-full flex flex-col"
        >
            {/* Artwork Banner */}
            <div className="mx-4 mt-4 mb-8 relative">
                <img
                    src={artworkUrl}
                    alt={title}
                    className="w-full h-32 object-cover rounded-lg"
                    loading="lazy"
                    onError={(e) => {
                        e.target.src = PLACEHOLDER_COVER;
                    }}
                />
            </div>

            {/* Cover Circular (mitad incrustado con el borde de recorte de InteractiveGameCard) */}
            <div className="flex justify-center -mt-12 z-10 mb-3">
                <img
                    src={coverUrl}
                    alt={title}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary-navy-dark group-hover:border-primary-yellow transition-colors"
                    loading="lazy"
                    onError={(e) => {
                        e.target.src = PLACEHOLDER_COVER;
                    }}
                />
            </div>

            {/* Info y acciones */}
            <div className="px-4 pb-4 text-center flex flex-col flex-grow">
                <h3
                    className="text-white font-bold text-base mb-1.5 line-clamp-2 min-h-[2.75rem] px-2 group-hover:text-primary-yellow transition-colors"
                    title={title}
                >
                    {title}
                </h3>

                {/* Metadatos: Clock + Time played y HardDriveDownload + Steam/Local */}
                <div className="flex items-center justify-center gap-4 text-gray-400 text-xs mb-4">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatPlayedLabel(playtimeMins)}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                        <HardDriveDownload className="w-3.5 h-3.5 shrink-0" />
                        <span>{isSteamInstalled ? "Steam" : "Local"}</span>
                    </span>
                </div>

                {/* Fila inferior: Ready to play + Settings */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-auto flex items-center gap-2"
                >
                    <button
                        type="button"
                        onClick={() => onPlay?.(gameItem)}
                        disabled={isRunning}
                        className={`flex-1 h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${isRunning
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
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Ready to play</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenSettings?.(gameItem)}
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

export default memo(ReadyToPlayCard);