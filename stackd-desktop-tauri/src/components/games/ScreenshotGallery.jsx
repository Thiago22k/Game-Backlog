import { formatIGDBImage } from '../../utils/formatters';

const ScreenshotGallery = ({ game }) => {
  // Si no hay screenshots, mostrar mensaje
  if (!game.screenshots || game.screenshots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capturas de pantalla</h3>
        <p className="text-gray-500 text-sm">No hay capturas de pantalla disponibles.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Capturas de pantalla</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {game.screenshots.slice(0, 6).map((screenshot) => (
          <img
            key={screenshot.id}
            src={formatIGDBImage(screenshot.url, 't_screenshot_med')}
            alt="Screenshot"
            className="w-full h-40 object-cover rounded-lg hover:opacity-75 transition-opacity cursor-pointer"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ScreenshotGallery;