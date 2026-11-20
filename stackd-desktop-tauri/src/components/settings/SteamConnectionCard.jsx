import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ExternalLink, Download, RefreshCw, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import useSteamLinkPopup from '../../hooks/useSteamLinkPopup';
import SteamIcon from '../../assets/steam-icon.svg?react';
import SteamImportModal from './SteamImportModal';

const STEAM_RESULTS = {
  linked: { type: 'success', message: 'Steam account linked successfully!' },
  cancelled: { type: 'error', message: 'Steam sign-in was cancelled.' },
  already_linked: { type: 'error', message: 'That Steam account is already linked to another Stackd account.' },
  already_has_account: { type: 'error', message: 'Your account already has a Steam account linked.' },
  invalid_state: { type: 'error', message: 'The Steam link request expired. Please try again.' },
  verification_failed: { type: 'error', message: 'We could not verify your Steam sign-in. Please try again.' },
  error: { type: 'error', message: 'Something went wrong linking your Steam account.' },
};

const formatRelativeSyncTime = (isoDate) => {
  if (!isoDate) return 'Never synced';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Synced just now';
  if (diffMin < 60) return `Synced ${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Synced ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Synced ${diffDays}d ago`;
};

const SteamConnectionCard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const handledResult = useRef(false);

  const canUnlink = user?.has_password !== false;

  const loadStatus = useCallback(async () => {
    try {
      const response = await axios.get(ENDPOINTS.STEAM.STATUS);
      setStatus(response.data);
    } catch {
      setStatus({ linked: false, failed: true });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const result = searchParams.get('steam');
    if (!result || handledResult.current) return;
    handledResult.current = true;

    const info = STEAM_RESULTS[result] || STEAM_RESULTS.error;
    if (info.type === 'success') toast.success(info.message);
    else toast.error(info.message);

    const next = new URLSearchParams(searchParams);
    next.delete('steam');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const showResult = useCallback(
    (code) => {
      const info = STEAM_RESULTS[code] || STEAM_RESULTS.error;
      if (info.type === 'success') {
        toast.success(info.message);
        loadStatus();
      } else {
        toast.error(info.message);
      }
    },
    [loadStatus]
  );

  const { start: handleLink, isWaiting: isLinking } = useSteamLinkPopup({
    onResult: showResult,
    onError: (message) => toast.error(message),
  });

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(ENDPOINTS.STEAM.SYNC);
      const { is_private, updated_games, new_games_added, account } = response.data;

      if (account) setStatus(account);
      else await loadStatus();

      if (is_private) {
        toast.error('Your Steam game details are set to Private.');
      } else {
        const parts = [];
        if (new_games_added > 0) parts.push(`${new_games_added} new`);
        if (updated_games > 0) parts.push(`${updated_games} updated`);
        toast.success(parts.length > 0 ? `Steam synced (${parts.join(', ')})` : 'Steam library is up to date');
      }
    } catch (error) {
      if (error.response?.status === 429) {
        const mins = Math.ceil((error.response.data?.retry_after_seconds || 60) / 60);
        toast.error(`Please wait ~${mins} min before syncing again.`);
      } else {
        toast.error(error.response?.data?.error || 'Could not sync Steam library.');
      }
      await loadStatus();
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!status?.linked || savingPrefs) return;
    const nextValue = !status.auto_sync;
    setSavingPrefs(true);
    try {
      const response = await axios.patch(ENDPOINTS.STEAM.PREFERENCES, { auto_sync: nextValue });
      if (response.data?.account) {
        setStatus(response.data.account);
      } else {
        setStatus((prev) => ({ ...prev, auto_sync: nextValue }));
      }
      toast.success(nextValue ? 'Automatic Steam sync enabled' : 'Automatic Steam sync disabled');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update sync preference.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleUnlink = async () => {
    setBusy(true);
    try {
      await axios.delete(ENDPOINTS.STEAM.UNLINK);
      toast.success('Steam account unlinked.');
      setConfirmUnlink(false);
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not unlink Steam.');
    } finally {
      setBusy(false);
    }
  };

  const renderSyncBadge = () => {
    if (status?.library_visible === false || status?.last_sync_status === 'private') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
          <Lock size={11} /> Private Library
        </span>
      );
    }
    if (status?.last_sync_status === 'error') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/25">
          <AlertTriangle size={11} /> Sync Error
        </span>
      );
    }
    if (status?.last_sync_status === 'ok') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 size={11} /> {formatRelativeSyncTime(status.last_sync_at)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
        Not synced yet
      </span>
    );
  };

  return (
    <div className="bg-primary-navy-dark rounded-lg p-6 mb-6 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-[#00adee]/20 rounded-lg">
          <SteamIcon className="w-6 h-6 fill-[#00adee]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Steam</h3>
          <p className="text-sm text-gray-400">Link your Steam account to import your library and stats</p>
        </div>
      </div>

      {status === null && <p className="text-gray-400 text-sm">Loading...</p>}

      {status?.failed && (
        <p className="text-gray-400 text-sm mb-4">Could not load your Steam connection status.</p>
      )}

      {status && !status.linked && (
        <button
          onClick={handleLink}
          disabled={busy || isLinking}
          className="w-full sm:w-auto bg-[#00adee] hover:opacity-90 disabled:opacity-60 text-white px-6 py-2 rounded-lg font-semibold transition-all"
        >
          {isLinking ? 'Waiting for Steam...' : 'Link Steam Account'}
        </button>
      )}

      {status?.linked && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {status.avatar_url ? (
                <img src={status.avatar_url} alt="" className="w-12 h-12 rounded-lg shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-700 shrink-0" />
              )}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-white font-medium truncate">{status.persona_name || 'Steam account'}</p>
                  {renderSyncBadge()}
                </div>
                <p className="text-xs text-gray-400">SteamID: {status.steam_id64}</p>
                {status.profile_url && (
                  <a
                    href={status.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#00adee] hover:underline"
                  >
                    View Steam profile <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 bg-[#00adee] hover:opacity-90 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              >
                <Download size={16} />
                Import Library
              </button>

              <button
                onClick={handleSyncNow}
                disabled={syncing || busy}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>

              {!confirmUnlink ? (
                <button
                  onClick={() => setConfirmUnlink(true)}
                  disabled={!canUnlink}
                  title={!canUnlink ? 'Set a password first before unlinking Steam' : undefined}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Unlink
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Unlink Steam?</span>
                  <button
                    onClick={handleUnlink}
                    disabled={busy}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    {busy ? 'Unlinking...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmUnlink(false)}
                    disabled={busy}
                    className="text-gray-400 hover:text-white px-2 py-2 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Auto-Sync Preference Row */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div>
              <p className="text-sm font-medium text-white">Automatic daily sync</p>
              <p className="text-xs text-gray-400">
                Keep your Steam playtime and new games updated in the background without overriding manual statuses
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(status.auto_sync)}
              onClick={handleToggleAutoSync}
              disabled={savingPrefs}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${status.auto_sync ? 'bg-[#00adee]' : 'bg-gray-700'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${status.auto_sync ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          {!canUnlink && (
            <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
              Steam is your only sign-in method. Set a password above before unlinking your Steam account.
            </p>
          )}
        </div>
      )}

      <SteamImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={loadStatus}
      />
    </div>
  );
};

export default SteamConnectionCard;