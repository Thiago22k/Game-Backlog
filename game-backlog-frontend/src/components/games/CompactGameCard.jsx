import React from 'react';
import { Link } from 'react-router-dom';
import { getGameCover } from '../../utils/formatters';

const CompactGameCard = ({ game }) => {
    // Cover image logic using the formatter
    const imageUrl = getGameCover(game);

    // Formatear fecha
    const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : 'TBA';

    // Obtener género principal
    const genre = game.genres?.[0]?.name || 'Unknown';

    return (
        <Link
            to={`/game/${game.slug || game.id}`}
            className="bg-primary-navy-dark rounded-xl overflow-hidden transition-all flex flex-row h-[120px] group relative block hover:ring-1 hover:ring-primary-yellow"
        >
            {/* Cover Image */}
            <div className="w-[90px] h-full flex-shrink-0 relative overflow-hidden bg-gray-900">
                <img
                    src={imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => { e.target.src = '/placeholder-game.png' }}
                />
            </div>

            {/* Content Area */}
            <div className="flex flex-col flex-grow p-4 justify-center overflow-hidden">
                <span className="font-bold text-white group-hover:text-primary-yellow transition-colors line-clamp-2 text-base mb-1" title={game.name}>
                    {game.name}
                </span>
                <span className="text-sm text-gray-400 mt-1">
                    {genre} • {releaseYear}
                </span>
            </div>
        </Link>
    );
};

export default CompactGameCard;
