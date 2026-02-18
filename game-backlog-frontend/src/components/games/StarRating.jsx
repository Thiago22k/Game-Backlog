import { useState } from 'react';

const StarRating = ({ rating, onRate, interactive = true }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const stars = [1, 2, 3, 4, 5];

  // Función para determinar el color según el rating
  const getStarColor = (star, currentRating) => {
    if (star > currentRating) {
      return 'bg-gray-600'; // Sin llenar
    }

    // Determinar color según el rating total
    if (currentRating === 1) {
      return 'bg-red-500'; // 1 estrella = rojo
    } else if (currentRating === 2 || currentRating === 3) {
      return 'bg-orange-500'; // 2-3 estrellas = naranja
    } else {
      return 'bg-green-500'; // 4-5 estrellas = verde
    }
  };

  return (
    <div className="flex items-center space-x-0.5">
      {stars.map((star) => {
        const currentRating = hoverRating || rating || 0;
        const isFilled = star <= currentRating;
        const color = getStarColor(star, currentRating);

        return (
          <button
            key={star}
            disabled={!interactive}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && onRate(star)}
            className={`w-5 h-5 rounded-full transition-all ${color} ${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            }`}
          />
        );
      })}
    </div>
  );
};

export default StarRating;