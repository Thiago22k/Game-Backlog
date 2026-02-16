const ExploreFilters = ({ 
  selectedTimeRange,
  setSelectedTimeRange,
  selectedGenres,
  setSelectedGenres,
  selectedPlatforms,
  setSelectedPlatforms,
  availableGenres,
  availablePlatforms,
  onClear
}) => {
  const handleGenreToggle = (genreId) => {
    if (selectedGenres.includes(genreId)) {
      setSelectedGenres(selectedGenres.filter(id => id !== genreId));
    } else {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  };

  const handlePlatformToggle = (platformId) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(id => id !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>

      {/* Rango de tiempo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📅 Fecha de lanzamiento
        </label>
        <select
          value={selectedTimeRange || ''}
          onChange={(e) => setSelectedTimeRange(e.target.value || null)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Cualquier fecha</option>
          <option value="last_month">Último mes</option>
          <option value="last_year">Último año</option>
          <option value="last_5_years">Últimos 5 años</option>
          <option value="upcoming">Próximos lanzamientos</option>
        </select>
      </div>

      {/* Géneros */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🎮 Géneros
        </label>
        <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded p-2">
          {availableGenres.map(genre => (
            <label key={genre.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={selectedGenres.includes(genre.id)}
                onChange={() => handleGenreToggle(genre.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{genre.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Plataformas */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          💻 Plataformas
        </label>
        <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded p-2">
          {availablePlatforms.map(platform => (
            <label key={platform.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform.id)}
                onChange={() => handlePlatformToggle(platform.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{platform.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Botón limpiar */}
      <button
        onClick={onClear}
        className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 text-sm font-medium"
      >
        Limpiar filtros
      </button>
    </div>
  );
};

export default ExploreFilters;