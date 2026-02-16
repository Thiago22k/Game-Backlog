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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>

      {/* Time range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📅 Release Date
        </label>
        <select
          value={selectedTimeRange || ''}
          onChange={(e) => setSelectedTimeRange(e.target.value || null)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Any date</option>
          <option value="last_month">Last month</option>
          <option value="last_year">Last year</option>
          <option value="last_5_years">Last 5 years</option>
          <option value="upcoming">Upcoming releases</option>
        </select>
      </div>

      {/* Genres */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🎮 Genres
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

      {/* Platforms */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          💻 Platforms
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

      {/* Clear button */}
      <button
        onClick={onClear}
        className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 text-sm font-medium"
      >
        Clear filters
      </button>
    </div>
  );
};

export default ExploreFilters;