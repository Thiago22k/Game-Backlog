import { Heart } from 'lucide-react';
import { useGameLikes } from '../../hooks/useGameLikes';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * A reusable like button for games.
 * Props:
 *   - igdbGameId: number (required)
 *   - gameName: string
 *   - coverUrl: string  (IGDB image_id, not full URL)
 *   - size: 'sm' | 'md' | 'lg'   (default: 'md')
 *   - showCount: boolean (default: true)
 */
const GameLikeButton = ({
    igdbGameId,
    gameName,
    coverUrl,
    size = 'md',
    showCount = true,
}) => {
    const { isAuthenticated } = useAuth();
    const { liked, likesCount, loading, toggling, toggleLike } = useGameLikes(igdbGameId);

    const sizeMap = {
        sm: { icon: 16, padding: 'p-1.5', text: 'text-xs' },
        md: { icon: 20, padding: 'p-2', text: 'text-sm' },
        lg: { icon: 24, padding: 'p-3', text: 'text-base' },
    };
    const s = sizeMap[size] || sizeMap.md;

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            toast.error('Log in to like games');
            return;
        }
        toggleLike(gameName, coverUrl);
    };

    if (loading) return null;

    return (
        <button
            onClick={handleClick}
            disabled={toggling}
            title={liked ? 'Unlike this game' : 'Like this game'}
            className={`
                flex items-center gap-1.5 ${s.padding} rounded-full transition-all duration-200
                ${liked
                    ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 ring-1 ring-pink-500/40'
                    : 'bg-black/30 text-gray-400 hover:bg-pink-500/10 hover:text-pink-400 ring-1 ring-white/10'
                }
                ${toggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
            `}
        >
            <Heart
                size={s.icon}
                className={`transition-all duration-200 ${liked ? 'fill-pink-400' : ''}`}
            />
            {showCount && likesCount > 0 && (
                <span className={`font-semibold tabular-nums ${s.text} ${liked ? 'text-pink-400' : 'text-gray-400'}`}>
                    {likesCount}
                </span>
            )}
        </button>
    );
};

export default GameLikeButton;
