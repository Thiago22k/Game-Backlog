import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import { getGameCover } from '../../utils/formatters';

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(query)}`);
        setResults(response.data.games.slice(0, 8)); // Max 8 results
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleGameClick = (game) => {
    navigate(`/game/${game.slug || game.id}`);
    onClose();
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-start justify-center pt-32 px-4"
      onClick={onClose}
    >
      <div
        className="bg-primary-navy rounded-2xl shadow-2xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-6 py-4 border-b border-gray-700">
          <Search className="text-gray-400 mr-3" size={22} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games..."
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white ml-3"
          >
            <X size={22} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-gray-400">
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="py-8 text-center text-gray-400">
              No games found for "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleGameClick(game)}
                  className="w-full flex items-center px-6 py-3 hover:bg-white hover:bg-opacity-5 transition-all text-left"
                >
                  <img
                    src={getGameCover(game)}
                    alt={game.name}
                    className="w-12 h-16 object-cover rounded"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/48x64?text=?';
                    }}
                  />
                  <div className="ml-4 flex-1">
                    <p className="text-white font-medium">{game.name}</p>
                    {game.rating && (
                      <p className="text-sm text-gray-400">
                        Rating: {Math.round(game.rating)}/100
                      </p>
                    )}
                  </div>
                  <Search className="text-gray-500" size={18} />
                </button>
              ))}
            </div>
          )}

          {!query && !loading && (
            <div className="py-8 px-6 text-center">
              <Search className="mx-auto text-gray-600 mb-3" size={32} />
              <p className="text-gray-400 text-sm">
                Start typing to search for games
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {query && results.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-500">
              Press <kbd className="px-2 py-1 bg-gray-800 rounded">ESC</kbd> to close
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchModal;