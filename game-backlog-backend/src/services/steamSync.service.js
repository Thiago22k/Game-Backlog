const pool = require('../config/database');
const SteamAccount = require('../models/steam.model');
const steamService = require('./steam.service');
const igdbService = require('./igdb.service');
const Activity = require('../models/activity.model');

const TWO_WEEKS_SECONDS = 14 * 24 * 60 * 60;

// Tipos de IGDB que corresponden a DLC, expansiones, mods o episodios sueltos
// (0: main_game, 3: bundle, 8: remake, 9: remaster, 10: expanded_game, 11: port)
const IGNORED_IGDB_GAME_TYPES = new Set([1, 2, 4, 5, 6, 7, 12, 13, 14]);

// Normaliza una fila de external_games de IGDB siguiendo las reglas del plan (§6)
const classifyExternalGame = (ext) => {
    const game = ext?.game;
    if (!game || !game.id) {
        return { igdb_game_id: null, match_status: 'unmatched' };
    }

    const gameType = Number(game.game_type ?? 0);

    // Descartar DLC, expansiones, mods, soundtracks, etc.
    if (IGNORED_IGDB_GAME_TYPES.has(gameType)) {
        return { igdb_game_id: null, match_status: 'skipped_dlc' };
    }

    // Si tiene version_parent (edición GOTY/Deluxe) o parent_game (remaster/port), apuntar al juego canónico
    if (game.version_parent) {
        return { igdb_game_id: Number(game.version_parent), match_status: 'matched' };
    }
    if (game.parent_game) {
        return { igdb_game_id: Number(game.parent_game), match_status: 'matched' };
    }

    // Bundles sin padre quedan para revisión manual
    if (gameType === 3) {
        return { igdb_game_id: Number(game.id), match_status: 'needs_review' };
    }

    return { igdb_game_id: Number(game.id), match_status: 'matched' };
};

// Resuelve en steam_igdb_map los AppIDs que aún no estén mapeados
const resolveUnmappedAppIds = async (appIds = []) => {
    const uniqueIds = [...new Set(appIds.map(Number).filter(Boolean))];
    if (!uniqueIds.length) return new Map();

    const existing = await SteamAccount.getMappingsByAppIds(uniqueIds);
    const mapByAppId = new Map(existing.map((row) => [Number(row.steam_appid), row]));

    const missingIds = uniqueIds.filter((id) => !mapByAppId.has(id));
    if (!missingIds.length) return mapByAppId;

    const externalRows = await igdbService.resolveSteamExternalGames(missingIds);

    // Agrupar respuestas de IGDB por uid (Steam AppID)
    const extByUid = new Map();
    for (const row of externalRows) {
        const uid = Number(row.uid);
        if (!uid) continue;
        if (!extByUid.has(uid)) extByUid.set(uid, []);
        extByUid.get(uid).push(row);
    }

    const newEntries = [];
    for (const appId of missingIds) {
        const candidates = extByUid.get(appId) || [];
        if (!candidates.length) {
            newEntries.push({ steam_appid: appId, igdb_game_id: null, match_status: 'unmatched' });
            continue;
        }

        // Priorizar main_game / remaster sobre DLC o bundles si un appid tiene múltiples registros
        const classified = candidates.map(classifyExternalGame);
        const best =
            classified.find((c) => c.match_status === 'matched') ||
            classified.find((c) => c.match_status === 'needs_review') ||
            classified[0];

        newEntries.push({
            steam_appid: appId,
            igdb_game_id: best.igdb_game_id,
            match_status: best.match_status,
        });
    }

    await SteamAccount.upsertMappingsBatch(newEntries);
    for (const entry of newEntries) {
        mapByAppId.set(entry.steam_appid, entry);
    }

    return mapByAppId;
};

// Regla por defecto de estado inicial al importar (plan §7)
const inferDefaultStatus = (steamGame) => {
    const twoWeeksCutoffMs = Date.now() - TWO_WEEKS_SECONDS * 1000;
    const playedInLast2Weeks =
        Number(steamGame.playtime_2weeks_min || 0) > 0 ||
        (steamGame.last_played_at && new Date(steamGame.last_played_at).getTime() >= twoWeeksCutoffMs);

    return playedInLast2Weeks ? 'playing' : 'backlog';
};

// Actualiza steam_library desde Steam Web API y resuelve mapeos contra IGDB
const refreshLibraryAndMappings = async (userId, steamId64) => {
    const owned = await steamService.getOwnedGames(steamId64);
    if (owned.isPrivate) {
        await SteamAccount.updateSyncState(userId, { libraryVisible: false, syncStatus: 'private' });
        return { isPrivate: true, library: [], mappings: new Map() };
    }

    // Enriquecer con GetRecentlyPlayedGames por si algún título no trajo playtime_2weeks
    const recent = await steamService.getRecentlyPlayedGames(steamId64);
    const recentMap = new Map(recent.map((r) => [r.steam_appid, r.playtime_2weeks_min]));

    const mergedGames = owned.games.map((g) => ({
        ...g,
        playtime_2weeks_min: g.playtime_2weeks_min || recentMap.get(g.steam_appid) || 0,
    }));

    await SteamAccount.upsertLibraryBatch(userId, mergedGames);
    await SteamAccount.updateSyncState(userId, { libraryVisible: true, syncStatus: 'ok' });

    const library = await SteamAccount.getUserLibrary(userId);
    const mappings = await resolveUnmappedAppIds(library.map((g) => g.steam_appid));

    return { isPrivate: false, library, mappings };
};

// Generar vista previa estructurada para la UI de importación
const buildImportPreview = async (userId) => {
    const account = await SteamAccount.findByUserId(userId);
    if (!account) {
        const err = new Error('No tienes una cuenta de Steam vinculada');
        err.statusCode = 404;
        throw err;
    }

    const { isPrivate, library, mappings } = await refreshLibraryAndMappings(userId, account.steam_id64);

    if (isPrivate) {
        return {
            is_private: true,
            summary: { total: 0, ready: 0, needs_review: 0, already_in_library: 0, ignored: 0, unmatched: 0, skipped_dlc: 0 },
            sections: { ready: [], needs_review: [], already_in_library: [], ignored: [], unmatched: [] },
        };
    }

    // Obtener juegos que el usuario ya tiene en user_games
    const userGamesRes = await pool.query(
        'SELECT igdb_game_id, status, rating, source, steam_appid FROM user_games WHERE user_id = $1',
        [userId]
    );
    const existingUserGames = new Map(userGamesRes.rows.map((r) => [Number(r.igdb_game_id), r]));

    // Obtener metadatos ligeros de IGDB (nombre, carátula, slug) para los juegos mapeados
    const igdbIds = [];
    for (const m of mappings.values()) {
        if (m.igdb_game_id) igdbIds.push(Number(m.igdb_game_id));
    }
    const igdbGames = await igdbService.getLightGamesByIds(igdbIds);
    const igdbMap = new Map(igdbGames.map((g) => [Number(g.id), g]));

    const sections = {
        ready: [],
        needs_review: [],
        already_in_library: [],
        ignored: [],
        unmatched: [],
    };
    let skippedDlcCount = 0;

    // Deduplicar candidatos nuevos por igdb_game_id para no mostrar duplicados si el usuario tiene 2 ediciones
    const seenReadyIgdbIds = new Set();

    for (const item of library) {
        const appId = Number(item.steam_appid);
        const mapping = mappings.get(appId) || { match_status: 'unmatched', igdb_game_id: null };

        if (mapping.match_status === 'skipped_dlc') {
            skippedDlcCount++;
            continue;
        }

        const baseItem = {
            steam_appid: appId,
            steam_name: item.name,
            playtime_minutes: Number(item.playtime_minutes || 0),
            playtime_2weeks_min: Number(item.playtime_2weeks_min || 0),
            last_played_at: item.last_played_at,
            suggested_status: inferDefaultStatus(item),
        };

        if (item.ignored) {
            const igdbGame = mapping.igdb_game_id ? igdbMap.get(Number(mapping.igdb_game_id)) : null;
            sections.ignored.push({
                ...baseItem,
                igdb_game_id: mapping.igdb_game_id || null,
                igdb_game: igdbGame || null,
            });
            continue;
        }

        if (mapping.match_status === 'unmatched' || !mapping.igdb_game_id) {
            sections.unmatched.push({
                ...baseItem,
                igdb_game_id: null,
                igdb_game: null,
            });
            continue;
        }

        const igdbId = Number(mapping.igdb_game_id);
        const igdbGame = igdbMap.get(igdbId) || { id: igdbId, name: item.name };
        const alreadyOwned = existingUserGames.get(igdbId);

        if (alreadyOwned) {
            sections.already_in_library.push({
                ...baseItem,
                igdb_game_id: igdbId,
                igdb_game: igdbGame,
                current_status: alreadyOwned.status,
                current_rating: alreadyOwned.rating,
                current_source: alreadyOwned.source,
            });
            continue;
        }

        if (mapping.match_status === 'needs_review') {
            sections.needs_review.push({
                ...baseItem,
                igdb_game_id: igdbId,
                igdb_game: igdbGame,
            });
            continue;
        }

        if (seenReadyIgdbIds.has(igdbId)) continue;
        seenReadyIgdbIds.add(igdbId);

        sections.ready.push({
            ...baseItem,
            igdb_game_id: igdbId,
            igdb_game: igdbGame,
        });
    }

    return {
        is_private: false,
        summary: {
            total: library.length,
            ready: sections.ready.length,
            needs_review: sections.needs_review.length,
            already_in_library: sections.already_in_library.length,
            ignored: sections.ignored.length,
            unmatched: sections.unmatched.length,
            skipped_dlc: skippedDlcCount,
        },
        sections,
    };
};

// Confirmar importación (re-resuelve appids en el servidor por seguridad)
const commitImport = async (userId, { items = [], ignoredAppIds = [], manualOverrides = [] } = {}) => {
    const account = await SteamAccount.findByUserId(userId);
    if (!account) {
        const err = new Error('No tienes una cuenta de Steam vinculada');
        err.statusCode = 404;
        throw err;
    }

    const library = await SteamAccount.getUserLibrary(userId);
    const libraryByAppId = new Map(library.map((g) => [Number(g.steam_appid), g]));

    // Validar que los appids enviados pertenezcan realmente a la biblioteca de Steam del usuario
    const validAppIds = items
        .map((i) => Number(i.steam_appid))
        .filter((id) => libraryByAppId.has(id));

    const mappings = await resolveUnmappedAppIds(validAppIds);

    // Overrides manuales elegidos por el usuario para juegos que estaban `unmatched`
    const overrideMap = new Map();
    for (const ov of manualOverrides) {
        const appId = Number(ov.steam_appid);
        const igdbId = Number(ov.igdb_game_id);
        if (libraryByAppId.has(appId) && igdbId > 0) {
            overrideMap.set(appId, igdbId);
        }
    }

    const ALLOWED_STATUSES = new Set(['playing', 'backlog']);

    // Deduplicar por igdb_game_id (si dos appids apuntan al mismo IGDB ID, se fusionan tiempos)
    const deduplicated = new Map();

    for (const reqItem of items) {
        const appId = Number(reqItem.steam_appid);
        const libRow = libraryByAppId.get(appId);
        if (!libRow) continue;

        const resolvedIgdbId = overrideMap.get(appId) || mappings.get(appId)?.igdb_game_id;
        if (!resolvedIgdbId) continue;

        const status = ALLOWED_STATUSES.has(reqItem.status)
            ? reqItem.status
            : inferDefaultStatus(libRow);

        const igdbId = Number(resolvedIgdbId);
        const existing = deduplicated.get(igdbId);

        if (!existing) {
            deduplicated.set(igdbId, {
                igdb_game_id: igdbId,
                steam_appid: appId,
                status,
                playtime_minutes: Number(libRow.playtime_minutes || 0),
                last_played_at: libRow.last_played_at || null,
            });
        } else {
            existing.playtime_minutes += Number(libRow.playtime_minutes || 0);
            if (status === 'playing') existing.status = 'playing';
            if (
                libRow.last_played_at &&
                (!existing.last_played_at || new Date(libRow.last_played_at) > new Date(existing.last_played_at))
            ) {
                existing.last_played_at = libRow.last_played_at;
            }
        }
    }

    const client = await pool.connect();
    let importedCount = 0;
    let linkedExistingCount = 0;

    try {
        await client.query('BEGIN');

        // Reactivar en steam_library cualquier appid incluido en esta importación
        if (validAppIds.length > 0) {
            await client.query(
                'UPDATE steam_library SET ignored = false WHERE user_id = $1 AND steam_appid = ANY($2::int[])',
                [userId, validAppIds]
            );
        }

        // Marcar como ignorados los que el usuario excluyó explícitamente
        const validIgnored = ignoredAppIds
            .map(Number)
            .filter((id) => libraryByAppId.has(id) && !validAppIds.includes(id));

        if (validIgnored.length > 0) {
            await client.query(
                'UPDATE steam_library SET ignored = true WHERE user_id = $1 AND steam_appid = ANY($2::int[])',
                [userId, validIgnored]
            );
        }

        // Insertar nuevos o enlazar juegos manuales ya existentes en user_games sin pisar estado/rating del usuario
        for (const game of deduplicated.values()) {
            const existingRes = await client.query(
                'SELECT id FROM user_games WHERE user_id = $1 AND igdb_game_id = $2',
                [userId, game.igdb_game_id]
            );

            if (existingRes.rows.length > 0) {
                await client.query(
                    `UPDATE user_games
           SET steam_appid = $3,
               playtime_minutes = $4,
               last_played_at = COALESCE($5, last_played_at),
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND igdb_game_id = $2`,
                    [userId, game.igdb_game_id, game.steam_appid, game.playtime_minutes, game.last_played_at]
                );
                linkedExistingCount++;
            } else {
                await client.query(
                    `INSERT INTO user_games (
             user_id, igdb_game_id, status, source, status_set_by, steam_appid, playtime_minutes, last_played_at
           )
           VALUES ($1, $2, $3, 'steam', 'steam', $4, $5, $6)`,
                    [userId, game.igdb_game_id, game.status, game.steam_appid, game.playtime_minutes, game.last_played_at]
                );
                importedCount++;
            }
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    if (importedCount > 0) {
        Activity.logActivity(userId, 'IMPORTED_STEAM_LIBRARY', 'STEAM', account.steam_id64, {
            imported_count: importedCount,
            linked_count: linkedExistingCount,
        }).catch((err) => console.error('Error registrando actividad de importación Steam:', err));
    }

    return {
        imported: importedCount,
        linked_existing: linkedExistingCount,
        ignored: validIgnoredCount(ignoredAppIds, libraryByAppId, validAppIds),
    };
};

const validIgnoredCount = (ignoredAppIds, libraryByAppId, validAppIds) =>
    ignoredAppIds.map(Number).filter((id) => libraryByAppId.has(id) && !validAppIds.includes(id)).length;

module.exports = {
    resolveUnmappedAppIds,
    refreshLibraryAndMappings,
    buildImportPreview,
    commitImport,
};