import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getGameCover } from '../../utils/formatters';

const CompactGameCard = ({ game }) => {
    const imageUrl = getGameCover(game);

    const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : 'TBA';

    const genre = game.genres?.[0]?.name || 'Unknown';
    const primaryReason = game.reasons?.[0] || null;

    return (
        <Link
            to={`/game/${game.slug || game.id}`}
            className="bg-primary-navy-dark rounded-xl overflow-hidden flex flex-row h-[120px] group relative hover:-translate-y-1 hover:bg-primary-navy-light transition-all duration-200 cursor-pointer"
        >
            {/* Cover Image */}
            <div className="w-[90px] h-full flex-shrink-0 relative overflow-hidden bg-gray-900">
                <img
                    src={imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => { e.target.src = '/placeholder-game.png'; }}
                />
                {game.match_percent && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-primary-yellow text-[10px] font-bold">
                        {game.match_percent}%
                    </span>
                )}
            </div>

            {/* Content Area */}
            <div className="flex flex-col flex-grow p-3.5 justify-center overflow-hidden">
                <span className="font-bold text-white group-hover:text-primary-yellow transition-colors line-clamp-1 text-base" title={game.name}>
                    {game.name}
                </span>
                <span className="text-xs text-gray-400 mt-1 truncate">
                    {genre} • {releaseYear}
                </span>
                {primaryReason && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary-yellow/90 mt-1.5 truncate" title={primaryReason}>
                        <Sparkles size={11} className="shrink-0" />
                        <span className="truncate">{primaryReason}</span>
                    </span>
                )}
            </div>
        </Link>
    );
};

export default CompactGameCard;