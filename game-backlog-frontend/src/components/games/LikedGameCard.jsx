import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, MoreVertical } from 'lucide-react';
import { getGameCover, formatIGDBImage, PLACEHOLDER_COVER } from '../../utils/formatters';
import GameLikeButton from './GameLikeButton';
import StarRating from './StarRating';
import AddToCollectionModal from '../collections/AddToCollectionModal';
import { useCardMenu } from '../../hooks/useCardMenu';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LikedGameCard = ({ game, showAddButton = true }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isOpen: showOptionsMenu, open: openOptionsMenu, close: closeOptionsMenu, toggle: toggleOptionsMenu } = useCardMenu(`liked-${game.id || game.igdb_game_id}`);
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

    // Obtener artwork (banner superior)
    const artwork = game.screenshots?.[0]?.url || game.artworks?.[0]?.url || game.cover?.url;
    const artworkUrl = artwork
        ? formatIGDBImage(artwork, 't_screenshot_med')
        : getGameCover(game);

    // Cover (círculo)
    const coverUrl = getGameCover(game);

    // Género y año
    const genre = game.genres?.[0]?.name || 'Unknown';
    const genreId = game.genres?.[0]?.id;
    const year = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : 'TBA';

    const gameId = game.id || game.igdb_game_id;
    const slug = game.slug || gameId;

    const currentRating = game.owner_rating || 0;

    const handleAddToCollectionClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            sessionStorage.setItem('redirectAfterLogin', `/game/${slug}`);
            toast.error('Log in to add games to your collection');
            return;
        }

        setIsCollectionModalOpen(true);
    };

    return (
        <div className="relative h-full">
            {/* Card Container */}
            <div
                onClick={() => navigate(`/game/${slug}`)}
                className="bg-primary-navy-dark rounded-2xl overflow-hidden hover:ring-2 hover:ring-primary-yellow transition-all cursor-pointer group h-full flex flex-col"
            >
                {/* Header con Botón Like, Rating (hover) y Options Menu */}
                <div className="h-12 px-4 relative flex items-center justify-between w-full">
                    {/* Like Button (Izquierda) */}
                    <div onClick={(e) => e.stopPropagation()} className="mt-1 z-20">
                        <GameLikeButton
                            igdbGameId={gameId}
                            gameName={game.name}
                            coverUrl={game.cover?.image_id || game.cover?.url}
                            size="sm"
                            showCount={true}
                        />
                    </div>

                    {/* Star Rating (Centro, on hover) */}
                    {currentRating > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            <StarRating
                                rating={currentRating}
                                interactive={false}
                            />
                        </div>
                    )}

                    {/* Options Menu Button (Derecha) */}
                    <div className="z-30 mt-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleOptionsMenu();
                            }}
                            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {/* Options Dropdown */}
                        {showOptionsMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeOptionsMenu();
                                    }}
                                />
                                <div
                                    className="absolute right-0 top-full mt-1 w-48 bg-[#1e2330] rounded-lg shadow-xl border border-gray-700 py-1 z-50 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {showAddButton && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                closeOptionsMenu();
                                                handleAddToCollectionClick(e);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-primary-yellow transition-colors"
                                        >
                                            <FolderPlus size={16} />
                                            <span>Add to Collection</span>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Artwork Banner */}
                <div className="mx-4 mb-8">
                    <img
                        src={artworkUrl}
                        alt={game.name}
                        className="w-full h-32 object-cover rounded-lg"
                        loading="lazy"
                        onError={(e) => {
                            e.target.src = PLACEHOLDER_COVER;
                        }}
                    />
                </div>

                {/* Cover Circular (mitad incrustado) */}
                <div className="flex justify-center -mt-12 mb-3 z-10 relative">
                    <img
                        src={coverUrl}
                        alt={game.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary-navy-dark group-hover:border-primary-yellow transition-colors bg-primary-navy-dark"
                        loading="lazy"
                    />
                </div>

                {/* Info del juego */}
                <div className="px-4 pb-5 text-center relative flex flex-col flex-grow">
                    <h3 className="text-white font-bold text-base mb-1 line-clamp-2 min-h-[3rem] px-6" title={game.name}>
                        {game.name}
                    </h3>
                    <div className="mt-auto">
                        <p className="text-gray-400 text-sm relative z-20">
                            {genreId ? (
                                <span
                                    className="hover:text-primary-yellow hover:underline transition-colors cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/explore?genres=${genreId}`);
                                    }}
                                >
                                    {genre}
                                </span>
                            ) : (
                                genre
                            )} • {year}
                        </p>
                    </div>
                </div>
            </div>

            {/* Add to Collection Modal */}
            {isCollectionModalOpen && (
                <AddToCollectionModal
                    isOpen={isCollectionModalOpen}
                    onClose={() => setIsCollectionModalOpen(false)}
                    game={game}
                />
            )}
        </div>
    );
};

export default memo(LikedGameCard);
