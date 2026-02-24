import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';

/**
 * Half-star rating component using Lucide's Star icon.
 * Supports values: 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
 */
const StarRating = ({ rating, onRate, interactive = true }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || rating || 0;

  // Color based on the displayed rating value
  const getColor = (value) => {
    if (value <= 2) return '#ef4444';      // red-500 — 0.5 to 2
    if (value <= 3.5) return '#f97316';   // orange-500 — 2.5 to 3.5
    return '#22c55e';                      // green-500 — 4 to 5
  };

  const accentColor = displayRating > 0 ? getColor(displayRating) : '#6b7280';

  // For each star slot (1–5) determine how filled it should be:
  //  - 'full'  → rating >= star
  //  - 'half'  → rating = star - 0.5
  //  - 'empty' → rating < star - 0.5
  const getFill = (star) => {
    if (displayRating >= star) return 'full';
    if (displayRating >= star - 0.5) return 'half';
    return 'empty';
  };

  const handleMouseMove = useCallback((e, star) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setHoverRating(isLeftHalf ? star - 0.5 : star);
  }, [interactive]);

  const handleClick = useCallback((e, star) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const value = isLeftHalf ? star - 0.5 : star;
    onRate(value);
  }, [interactive, onRate]);

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => interactive && setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = getFill(star);

        return (
          <div
            key={star}
            className={`relative w-5 h-5 ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={(e) => handleClick(e, star)}
          >
            {/* Base star — always gray */}
            <Star
              size={20}
              className="absolute inset-0 transition-transform duration-100"
              style={{ color: '#374151' }}
              fill="#374151"
            />

            {/* Filled star — clipped based on fill state */}
            {fill !== 'empty' && (
              <span
                className="absolute inset-0 overflow-hidden transition-all duration-100"
                style={{
                  clipPath: fill === 'half' ? 'inset(0 50% 0 0)' : 'none',
                }}
              >
                <Star
                  size={20}
                  style={{ color: accentColor }}
                  fill={accentColor}
                  className={interactive ? 'hover:scale-110 transition-transform duration-100' : ''}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;