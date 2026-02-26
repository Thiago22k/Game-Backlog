import { Library, Edit3, Heart, Lock, Globe, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getGameCover } from '../../utils/formatters';
import defaultAvatar from '../../assets/default_avatar.png';
import { ASSETS_BASE_URL } from '../../utils/constants';

const CollectionCard = ({ collection, isOwner, showCreator = false, showPrivacy = true }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // collection.preview_games será un array de hasta 3 ids/covers
    const covers = collection.preview_games || [];
    const totalGames = collection.game_count || 0;

    // Mapeo básico de imágenes, si no hay cover usamos un placeholder propio o icono
    const renderCoversCollage = () => {
        if (covers.length === 0) {
            return (
                <div className="w-full h-full bg-primary-navy flex items-center justify-center">
                    <Library size={48} className="text-gray-500" />
                </div>
            );
        }

        if (covers.length === 1) {
            return (
                <img
                    src={getGameCover(covers[0])}
                    alt="Cover 1"
                    className="w-full h-full object-cover"
                />
            );
        }

        if (covers.length === 2) {
            return (
                <div className="w-full h-full flex">
                    <img
                        src={getGameCover(covers[0])}
                        alt="Cover 1"
                        className="w-1/2 h-full object-cover border-r border-primary-navy-dark"
                    />
                    <img
                        src={getGameCover(covers[1])}
                        alt="Cover 2"
                        className="w-1/2 h-full object-cover"
                    />
                </div>
            );
        }

        // 3 covers (o más, pero solo mostramos 3)
        return (
            <div className="w-full h-full flex">
                <img
                    src={getGameCover(covers[0])}
                    alt="Cover 1"
                    className="w-1/2 h-full object-cover border-r border-primary-navy-dark"
                />
                <div className="w-1/2 h-full flex flex-col">
                    <img
                        src={getGameCover(covers[1])}
                        alt="Cover 2"
                        className="w-full h-1/2 object-cover border-b border-primary-navy-dark"
                    />
                    <img
                        src={getGameCover(covers[2])}
                        alt="Cover 3"
                        className="w-full h-1/2 object-cover"
                    />
                </div>
            </div>
        );
    };

    return (
        <div
            onClick={() => navigate(`/collections/${collection.id}`)}
            className="bg-primary-navy-dark rounded-xl overflow-hidden border border-transparent hover:border-primary-yellow transition-all group flex flex-col h-full cursor-pointer relative"
        >
            {/* Collage Area */}
            <div className="h-48 w-full bg-primary-navy relative">
                {renderCoversCollage()}

                {/* Edit Button for Owner */}
                {isOwner && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/collections/${collection.id}/edit`, { state: { from: location.pathname } });
                        }}
                        className="absolute top-2 right-2 p-2 bg-primary-navy-dark/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-yellow hover:text-black shadow-md"
                        title="Edit Collection"
                    >
                        <Edit3 size={18} />
                    </button>
                )}
            </div>

            {/* Info Area */}
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1" title={collection.title}>
                    {collection.title}
                </h3>
                <p className="text-sm text-gray-400 mb-3 flex-grow line-clamp-2" title={collection.description}>
                    {collection.description || 'No description provided.'}
                </p>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-700/50">
                    <div className="flex items-center text-gray-400 text-sm gap-3">
                        <div className="flex items-center">
                            <Library size={14} className="mr-1.5" />
                            <span>{totalGames} game{totalGames !== 1 ? 's' : ''}</span>
                        </div>
                        {showPrivacy && (
                            collection.is_public ? (
                                <div className="flex items-center text-gray-500" title="Public Collection">
                                    <Globe size={14} className="mr-1" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Public</span>
                                </div>
                            ) : (
                                <div className="flex items-center text-primary-yellow/70" title="Private Collection">
                                    <Lock size={14} className="mr-1" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Private</span>
                                </div>
                            )
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                        <div className="flex items-center">
                            <MessageSquare size={14} className="mr-1.5" />
                            <span>{collection.comments_count || 0}</span>
                        </div>
                        <div className="flex items-center">
                            <Heart size={14} className="mr-1.5" />
                            <span>{collection.likes_count || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Creator Info */}
                {showCreator && (
                    <div
                        className="mt-4 pt-3 border-t border-gray-700/50 flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()} // Detener bubbling para que no abra la colección
                    >
                        <Link to={`/profile/${collection.creator_username}`} className="w-6 h-6 rounded-full overflow-hidden border border-gray-600 bg-primary-navy flex-shrink-0 hover:ring-2 hover:ring-primary-yellow transition-all">
                            <img
                                src={collection.creator_avatar_url ? `${ASSETS_BASE_URL}${collection.creator_avatar_url}` : defaultAvatar}
                                alt={collection.creator_username}
                                className="w-full h-full object-cover"
                            />
                        </Link>
                        <span className="text-sm text-gray-400 truncate">
                            by <Link to={`/profile/${collection.creator_username}`} className="text-gray-200 font-medium hover:text-primary-yellow transition-colors">{collection.creator_username}</Link>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectionCard;
