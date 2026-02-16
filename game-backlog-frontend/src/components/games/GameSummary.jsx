import { useState } from 'react';

const GameSummary = ({ game }) => {
  const [expanded, setExpanded] = useState(false);
  
  const summary = game.summary || game.storyline;
  
  // Si no hay resumen, no mostrar la sección completa
  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
        <p className="text-gray-500 text-sm">No hay descripción disponible para este juego.</p>
      </div>
    );
  }

  const isLong = summary.length > 300;
  const displayText = expanded || !isLong ? summary : `${summary.slice(0, 300)}...`;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          {expanded ? 'Ver menos' : 'Leer más'}
        </button>
      )}
    </div>
  );
};

export default GameSummary;