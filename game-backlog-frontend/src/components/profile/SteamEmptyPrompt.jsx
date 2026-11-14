import { Download } from 'lucide-react';
import SteamIcon from '../../assets/steam-icon.svg?react';

/**
 * Invitación a vincular/importar Steam dentro del estado vacío de la pestaña de juegos
 * (solo perfil propio). Es solo presentación: el estado viene de useSteamLinkPrompt.
 */
const SteamEmptyPrompt = ({ prompt }) => {
  const mode = prompt?.emptyMode;
  if (!mode) return null;

  const isImport = mode === 'import';

  return (
    <div className="max-w-md mx-auto bg-white/[0.04] border border-[#00adee]/25 rounded-lg p-5 mb-5">
      <div className="inline-flex p-3 bg-[#00adee]/20 rounded-lg mb-3">
        <SteamIcon className="w-6 h-6 fill-[#00adee]" />
      </div>

      <h3 className="text-white font-semibold mb-1">
        {isImport ? 'Steam linked! Fill your collection' : 'Already play on Steam?'}
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        {isImport
          ? 'Import your Steam library to add your games and playtime in one go.'
          : 'Link your account and import your library, playtime included, instead of adding games one by one.'}
      </p>

      {isImport ? (
        <button
          type="button"
          onClick={prompt.openImport}
          className="inline-flex items-center justify-center gap-2 bg-[#00adee] hover:opacity-90 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all"
        >
          <Download size={16} />
          Import library
        </button>
      ) : (
        <button
          type="button"
          onClick={prompt.startLink}
          disabled={prompt.isWaiting}
          className="bg-[#00adee] hover:opacity-90 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all"
        >
          {prompt.isWaiting ? 'Waiting for Steam...' : 'Link Steam'}
        </button>
      )}
    </div>
  );
};

export default SteamEmptyPrompt;
