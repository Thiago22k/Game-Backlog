import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Download, Search, Check, Clock, AlertCircle, Lock, RefreshCw } from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import SteamIcon from '../../assets/steam-icon.svg?react';

const formatPlaytime = (minutes) => {
    if (!minutes || minutes <= 0) return '0h';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours}h`;
};

const getIgdbCoverUrl = (game) => {
    const imageId = game?.cover?.image_id;
    if (!imageId) return null;
    return `https://images.igdb.com/igdb/image/upload/t_cover_small/${imageId}.jpg`;
};

const TABS = [
    { id: 'ready', label: 'Ready to Import' },
    { id: 'needs_review', label: 'Needs Review' },
    { id: 'already_in_library', label: 'Already in Library' },
    { id: 'unmatched', label: 'Unmatched' },
    { id: 'ignored', label: 'Ignored' },
];

const SteamImportModal = ({ isOpen, onClose, onImported }) => {
    const [loading, setLoading] = useState(true);
    const [committing, setCommitting] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [activeTab, setActiveTab] = useState('ready');

    // Selección y estados por steam_appid
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [statuses, setStatuses] = useState({});
    const [manualMatches, setManualMatches] = useState({}); // { [steam_appid]: igdbGameObj }

    // Búsqueda manual para juegos unmatched
    const [searchingAppId, setSearchingAppId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchingIgdb, setSearchingIgdb] = useState(false);

    const fetchPreview = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(ENDPOINTS.STEAM.IMPORT_PREVIEW);
            const data = res.data;
            setPreview(data);

            if (!data.is_private) {
                const initialSelected = new Set();
                const initialStatuses = {};

                for (const item of data.sections.ready || []) {
                    initialSelected.add(item.steam_appid);
                    initialStatuses[item.steam_appid] = item.suggested_status || 'backlog';
                }
                for (const item of data.sections.needs_review || []) {
                    initialStatuses[item.steam_appid] = item.suggested_status || 'backlog';
                }
                for (const item of data.sections.already_in_library || []) {
                    // Seleccionados por defecto para enlazar horas/appid sin cambiar su estado actual
                    initialSelected.add(item.steam_appid);
                    initialStatuses[item.steam_appid] = item.current_status || 'backlog';
                }
                for (const item of data.sections.unmatched || []) {
                    initialStatuses[item.steam_appid] = item.suggested_status || 'backlog';
                }
                for (const item of data.sections.ignored || []) {
                    initialStatuses[item.steam_appid] = item.suggested_status || 'backlog';
                }

                setSelectedIds(initialSelected);
                setStatuses(initialStatuses);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Could not load your Steam library.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPreview();
        }
    }, [isOpen]);

    const currentItems = useMemo(() => {
        if (!preview?.sections) return [];
        return preview.sections[activeTab] || [];
    }, [preview, activeTab]);

    const toggleItem = (appId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(appId)) next.delete(appId);
            else next.add(appId);
            return next;
        });
    };

    const setItemStatus = (appId, status) => {
        setStatuses((prev) => ({ ...prev, [appId]: status }));
    };

    const handleBulkSelectTab = (selectAll) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const item of currentItems) {
                if (activeTab === 'unmatched' && !manualMatches[item.steam_appid]) continue;
                if (selectAll) next.add(item.steam_appid);
                else next.delete(item.steam_appid);
            }
            return next;
        });
    };

    const handleBulkStatusTab = (newStatus) => {
        setStatuses((prev) => {
            const next = { ...prev };
            for (const item of currentItems) {
                next[item.steam_appid] = newStatus;
            }
            return next;
        });
    };

    const handleSearchIgdb = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearchingIgdb(true);
        try {
            const res = await axios.get(ENDPOINTS.GAMES.SEARCH, { params: { query: searchQuery.trim() } });
            setSearchResults(res.data.games || []);
        } catch {
            toast.error('Failed to search IGDB');
        } finally {
            setSearchingIgdb(false);
        }
    };

    const handleAssignManualMatch = (appId, igdbGame) => {
        setManualMatches((prev) => ({ ...prev, [appId]: igdbGame }));
        setSelectedIds((prev) => new Set(prev).add(appId));
        setSearchingAppId(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleCommit = async () => {
        if (!preview?.sections) return;
        setCommitting(true);

        try {
            const allImportable = [
                ...preview.sections.ready,
                ...preview.sections.needs_review,
                ...preview.sections.already_in_library,
                ...preview.sections.ignored,
                ...preview.sections.unmatched.filter((u) => manualMatches[u.steam_appid]),
            ];

            const itemsToCommit = [];
            const ignoredAppIds = [];
            const manualOverrides = [];

            for (const item of allImportable) {
                if (selectedIds.has(item.steam_appid)) {
                    itemsToCommit.push({
                        steam_appid: item.steam_appid,
                        status: statuses[item.steam_appid] || item.suggested_status || 'backlog',
                    });
                    if (manualMatches[item.steam_appid]) {
                        manualOverrides.push({
                            steam_appid: item.steam_appid,
                            igdb_game_id: manualMatches[item.steam_appid].id,
                        });
                    }
                } else if (preview.sections.ready.some((r) => r.steam_appid === item.steam_appid)) {
                    // Si desmarcó un juego que estaba listo, marcarlo como ignorado para futuros syncs
                    ignoredAppIds.push(item.steam_appid);
                }
            }

            const res = await axios.post(ENDPOINTS.STEAM.IMPORT_COMMIT, {
                items: itemsToCommit,
                ignoredAppIds,
                manualOverrides,
            });

            const { imported, linked_existing } = res.data;
            toast.success(
                `Imported ${imported} new game${imported === 1 ? '' : 's'}${linked_existing > 0 ? ` and linked ${linked_existing} existing` : ''
                }!`
            );
            onImported?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to import Steam library.');
        } finally {
            setCommitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-navy-dark border border-gray-700 rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#00adee]/20 rounded-lg">
                            <SteamIcon className="w-5 h-5 fill-[#00adee]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Import Steam Library</h3>
                            <p className="text-xs text-gray-400">
                                Review matched games, customize initial status, and avoid duplicates
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="py-16 text-center space-y-3">
                            <RefreshCw className="w-8 h-8 text-[#00adee] animate-spin mx-auto" />
                            <p className="text-white font-medium">Scanning your Steam library & matching with IGDB...</p>
                            <p className="text-xs text-gray-400">This may take a few seconds for large libraries.</p>
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center space-y-4">
                            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                            <p className="text-red-300 text-sm">{error}</p>
                            <button
                                onClick={fetchPreview}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            >
                                Retry
                            </button>
                        </div>
                    ) : preview?.is_private ? (
                        <div className="py-10 px-4 max-w-lg mx-auto text-center space-y-4">
                            <div className="p-3 bg-amber-500/15 rounded-full w-fit mx-auto">
                                <Lock className="w-7 h-7 text-amber-400" />
                            </div>
                            <h4 className="text-white font-semibold text-lg">Your Steam Game Details are Private</h4>
                            <p className="text-sm text-gray-300">
                                Steam hides your owned games and playtime by default. To import your library:
                            </p>
                            <ol className="text-left text-xs text-gray-300 bg-primary-navy rounded-lg p-4 space-y-2 list-decimal list-inside">
                                <li>Open your Steam Profile → <strong>Edit Profile</strong> → <strong>Privacy Settings</strong>.</li>
                                <li>Set <strong>My Profile</strong> and <strong>Game details</strong> to <strong>Public</strong>.</li>
                                <li>Wait a few seconds and click <strong>Refresh</strong> below.</li>
                            </ol>
                            <button
                                onClick={fetchPreview}
                                className="bg-[#00adee] hover:opacity-90 text-white px-5 py-2 rounded-lg text-sm font-semibold"
                            >
                                Refresh Library
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-800 pb-3">
                                {TABS.map((tab) => {
                                    const count = preview?.summary?.[tab.id] ?? 0;
                                    const active = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${active
                                                ? 'bg-primary-yellow text-primary-navy-dark'
                                                : 'bg-primary-navy text-gray-300 hover:text-white'
                                                }`}
                                        >
                                            {tab.label}
                                            <span
                                                className={`px-1.5 py-0.5 rounded-full text-[11px] ${active ? 'bg-black/15 text-primary-navy-dark' : 'bg-white/10 text-gray-300'
                                                    }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bulk Actions Bar */}
                            {currentItems.length > 0 && activeTab !== 'already_in_library' && (
                                <div className="flex flex-wrap items-center justify-between gap-2 bg-primary-navy/70 px-3.5 py-2.5 rounded-lg mb-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleBulkSelectTab(true)}
                                            className="text-gray-300 hover:text-white underline"
                                        >
                                            Select all
                                        </button>
                                        <span className="text-gray-600">•</span>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkSelectTab(false)}
                                            className="text-gray-300 hover:text-white underline"
                                        >
                                            Deselect all
                                        </button>
                                    </div>
                                    {activeTab !== 'unmatched' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Set tab status:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkStatusTab('backlog')}
                                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white"
                                            >
                                                Backlog
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkStatusTab('playing')}
                                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white"
                                            >
                                                Playing
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Items List */}
                            {currentItems.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-400">
                                    No games in this category.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {currentItems.map((item) => {
                                        const matchedGame = manualMatches[item.steam_appid] || item.igdb_game;
                                        const coverUrl = getIgdbCoverUrl(matchedGame);
                                        const isChecked = selectedIds.has(item.steam_appid);
                                        const canSelect = activeTab !== 'unmatched' || Boolean(manualMatches[item.steam_appid]);

                                        return (
                                            <div
                                                key={item.steam_appid}
                                                className="bg-primary-navy border border-gray-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        disabled={!canSelect}
                                                        onChange={() => toggleItem(item.steam_appid)}
                                                        className="w-4 h-4 rounded accent-primary-yellow cursor-pointer disabled:opacity-30"
                                                    />

                                                    {coverUrl ? (
                                                        <img src={coverUrl} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center text-[10px] text-gray-500 shrink-0">
                                                            N/A
                                                        </div>
                                                    )}

                                                    <div className="min-w-0">
                                                        <p className="text-white text-sm font-medium truncate">
                                                            {matchedGame?.name || item.steam_name}
                                                        </p>
                                                        {matchedGame?.name && matchedGame.name !== item.steam_name && (
                                                            <p className="text-[11px] text-gray-400 truncate">
                                                                Steam: {item.steam_name}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Clock size={12} /> {formatPlaytime(item.playtime_minutes)} played
                                                            </span>
                                                            {item.playtime_2weeks_min > 0 && (
                                                                <span className="text-emerald-400">
                                                                    Active recently ({formatPlaytime(item.playtime_2weeks_min)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Controls */}
                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                    {activeTab === 'already_in_library' ? (
                                                        <span className="text-xs px-2.5 py-1 rounded bg-white/10 text-gray-300 capitalize">
                                                            In library ({item.current_status}) — will sync playtime
                                                        </span>
                                                    ) : activeTab === 'unmatched' && !manualMatches[item.steam_appid] ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchingAppId(item.steam_appid);
                                                                setSearchQuery(item.steam_name);
                                                                setSearchResults([]);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-md"
                                                        >
                                                            <Search size={13} /> Match manually
                                                        </button>
                                                    ) : (
                                                        <>
                                                            {(activeTab === 'needs_review' || manualMatches[item.steam_appid]) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSearchingAppId(item.steam_appid);
                                                                        setSearchQuery(item.steam_name);
                                                                        setSearchResults([]);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 text-xs bg-white/5 hover:bg-white/15 text-gray-300 px-2.5 py-1.5 rounded-md"
                                                                    title="Change matched IGDB game"
                                                                >
                                                                    <Search size={12} />
                                                                    {manualMatches[item.steam_appid] ? 'Matched' : 'Change'}
                                                                </button>
                                                            )}
                                                            <select
                                                                value={statuses[item.steam_appid] || 'backlog'}
                                                                onChange={(e) => setItemStatus(item.steam_appid, e.target.value)}
                                                                className="bg-primary-navy-dark border border-gray-700 text-white text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-primary-yellow"
                                                            >
                                                                <option value="backlog">Backlog</option>
                                                                <option value="playing">Playing</option>
                                                            </select>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Manual IGDB Match Drawer */}
                            {searchingAppId && (
                                <div className="mt-4 bg-primary-navy border border-primary-yellow/40 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-sm font-semibold text-white">Find IGDB match</h5>
                                        <button
                                            onClick={() => setSearchingAppId(null)}
                                            className="text-xs text-gray-400 hover:text-white"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <form onSubmit={handleSearchIgdb} className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search game title on IGDB..."
                                            className="flex-1 bg-primary-navy-dark border border-gray-700 text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-primary-yellow"
                                        />
                                        <button
                                            type="submit"
                                            disabled={searchingIgdb}
                                            className="bg-primary-yellow text-primary-navy-dark font-semibold text-xs px-4 py-2 rounded-md"
                                        >
                                            {searchingIgdb ? 'Searching...' : 'Search'}
                                        </button>
                                    </form>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {searchResults.map((g) => (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => handleAssignManualMatch(searchingAppId, g)}
                                                className="w-full text-left flex items-center justify-between px-3 py-2 rounded bg-primary-navy-dark hover:bg-white/10 text-xs text-white"
                                            >
                                                <span>{g.name}</span>
                                                <span className="inline-flex items-center gap-1 text-primary-yellow">
                                                    <Check size={13} /> Select
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && !error && !preview?.is_private && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-primary-navy/40">
                        <span className="text-xs text-gray-400">
                            {selectedIds.size} game{selectedIds.size === 1 ? '' : 's'} selected
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={committing}
                                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCommit}
                                disabled={committing || selectedIds.size === 0}
                                className="inline-flex items-center gap-2 bg-primary-yellow hover:opacity-90 disabled:opacity-50 text-primary-navy-dark font-bold text-sm px-5 py-2 rounded-lg transition-all"
                            >
                                <Download size={16} />
                                {committing ? 'Importing...' : `Import ${selectedIds.size} Games`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SteamImportModal;