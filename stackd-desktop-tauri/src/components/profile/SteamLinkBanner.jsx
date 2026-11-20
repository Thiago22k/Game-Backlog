import { X, Download } from 'lucide-react';
import SteamIcon from '../../assets/steam-icon.svg?react';

/**
 * Banner para recomendar vincular Steam en el perfil propio.
 * Es solo presentación: el estado viene de useSteamLinkPrompt (ver ProfileLayout).
 */
const SteamLinkBanner = ({ prompt }) => {
  const mode = prompt?.bannerMode;
  if (!mode) return null;

  const isImport = mode === 'import';

  return (
    <div className="relative bg-primary-navy-dark border border-[#00adee]/30 rounded-lg p-4 pr-10 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="p-3 bg-[#00adee]/20 rounded-lg shrink-0 self-start sm:self-auto">
        <SteamIcon className="w-6 h-6 fill-[#00adee]" />
      </div>

      <div className="min-w-0 flex-1">
        {isImport ? (
          <>
            <h3 className="text-white font-semibold">Steam linked! Bring your games over</h3>
            <p className="text-sm text-gray-400">
              Import your Steam library to add your games and playtime to your profile.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-white font-semibold">Link your Steam account</h3>
            <p className="text-sm text-gray-400">
              Import your library and playtime in a few clicks instead of adding games one by one.
            </p>
          </>
        )}
      </div>

      {isImport ? (
        <button
          type="button"
          onClick={prompt.openImport}
          className="inline-flex items-center justify-center gap-2 bg-[#00adee] hover:opacity-90 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shrink-0"
        >
          <Download size={16} />
          Import library
        </button>
      ) : (
        <button
          type="button"
          onClick={prompt.startLink}
          disabled={prompt.isWaiting}
          className="bg-[#00adee] hover:opacity-90 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shrink-0"
        >
          {prompt.isWaiting ? 'Waiting for Steam...' : 'Link Steam'}
        </button>
      )}

      <button
        type="button"
        onClick={prompt.dismissBanner}
        aria-label="Dismiss"
        title={isImport ? 'Dismiss' : "Don't show again"}
        className="absolute top-2.5 right-2.5 p-1 text-gray-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default SteamLinkBanner;
