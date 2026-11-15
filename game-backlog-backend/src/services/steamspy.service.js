const axios = require('axios');
const pool = require('../config/database');
const { classifySteamTags } = require('../utils/tagTaxonomy');

let steamPriceService = null;
try {
    steamPriceService = require('./steamPrice.service');
} catch {
    steamPriceService = null;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const MIN_INTERVAL_MS = 1150; // Respeta estrictamente 1 petición/segundo de SteamSpy

let queueTail = Promise.resolve();
let lastRequestAt = 0;
const inFlightAppIds = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleRateLimited = (fn) => {
    const run = async () => {
        const elapsed = Date.now() - lastRequestAt;
        if (elapsed < MIN_INTERVAL_MS) {
            await sleep(MIN_INTERVAL_MS - elapsed);
        }
        lastRequestAt = Date.now();
        return fn();
    };
    const task = queueTail.then(run, run);
    queueTail = task.catch(() => { });
    return task;
};

const fetchAndPersistAppTags = async (steamAppId) => {
    const appId = Number(steamAppId);
    if (!appId || inFlightAppIds.has(appId)) return null;

    inFlightAppIds.add(appId);
    try {
        return await scheduleRateLimited(async () => {
            const res = await axios.get('https://steamspy.com/api.php', {
                params: { request: 'appdetails', appid: appId },
                timeout: 8000,
            });

            const data = res.data;
            if (!data || typeof data !== 'object' || !data.appid) return null;

            const rawTags =
                data.tags && typeof data.tags === 'object' && !Array.isArray(data.tags)
                    ? data.tags
                    : {};

            const classified = classifySteamTags(rawTags);

            await pool.query(
                `INSERT INTO steamspy_tags (
           steam_appid, tags, top_tags, subgenres, mechanics, settings, genres, positive, negative, updated_at
         )
         VALUES ($1, $2::jsonb, $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (steam_appid) DO UPDATE SET
           tags = EXCLUDED.tags,
           top_tags = EXCLUDED.top_tags,
           subgenres = EXCLUDED.subgenres,
           mechanics = EXCLUDED.mechanics,
           settings = EXCLUDED.settings,
           genres = EXCLUDED.genres,
           positive = EXCLUDED.positive,
           negative = EXCLUDED.negative,
           updated_at = CURRENT_TIMESTAMP`,
                [
                    appId,
                    JSON.stringify(rawTags),
                    classified.top_tags,
                    classified.subgenres,
                    classified.mechanics,
                    classified.settings,
                    classified.genres,
                    Number(data.positive || 0),
                    Number(data.negative || 0),
                ]
            );

            return {
                steam_appid: appId,
                tags: rawTags,
                ...classified,
            };
        });
    } catch (err) {
        console.warn(`⚠️ SteamSpy fetch falló para appid ${appId}:`, err.message);
        return null;
    } finally {
        inFlightAppIds.delete(appId);
    }
};

/**
 * Obtiene los perfiles de etiquetas clasificadas (Subgéneros, Mecánicas, Ambientación, Géneros)
 * para un conjunto de igdb_game_id. Los que falten se resuelven y encolan en background.
 */
const getTaxonomyForIgdbGames = async (
    igdbIds = [],
    { enqueueMissing = true, maxEnqueue = 14, blockingSeedIgdbId = null } = {}
) => {
    const cleanIds = [...new Set(igdbIds.map(Number).filter(Boolean))];
    if (cleanIds.length === 0) return new Map();

    // Si un juego ancla aún no está en steam_igdb_map, intentar resolver su AppID una sola vez
    if (blockingSeedIgdbId && steamPriceService?.resolveSteamAppId) {
        const check = await pool.query(
            'SELECT steam_appid FROM steam_igdb_map WHERE igdb_game_id = $1 LIMIT 1',
            [Number(blockingSeedIgdbId)]
        );
        if (check.rows.length === 0) {
            await steamPriceService.resolveSteamAppId(Number(blockingSeedIgdbId)).catch(() => null);
        }
    }

    const res = await pool.query(
        `SELECT
       sim.igdb_game_id,
       sim.steam_appid,
       st.tags,
       st.top_tags,
       st.subgenres,
       st.mechanics,
       st.settings,
       st.genres,
       st.updated_at
     FROM steam_igdb_map sim
     LEFT JOIN steamspy_tags st ON st.steam_appid = sim.steam_appid
     WHERE sim.igdb_game_id = ANY($1::int[])
       AND sim.match_status = 'matched'
       AND sim.steam_appid IS NOT NULL`,
        [cleanIds]
    );

    const resultMap = new Map();
    const toEnqueue = [];
    const now = Date.now();
    let blockingAppIdToFetch = null;

    for (const row of res.rows) {
        const igdbId = Number(row.igdb_game_id);
        const appId = Number(row.steam_appid);
        const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
        const hasTags = row.tags && Object.keys(row.tags).length > 0;
        const isFresh = hasTags && now - updatedAt < CACHE_TTL_MS;

        if (hasTags) {
            const classified = classifySteamTags(row.tags);
            resultMap.set(igdbId, {
                steam_appid: appId,
                tags: row.tags,
                ...classified,
            });
        }

        if (!isFresh && appId) {
            if (blockingSeedIgdbId && igdbId === Number(blockingSeedIgdbId)) {
                blockingAppIdToFetch = appId;
            } else {
                toEnqueue.push(appId);
            }
        }
    }

    // Para el juego ancla (ej. en GameDetails), esperamos 1s si aún no estaba cacheado para que el filtro sea exacto desde el primer clic
    if (blockingAppIdToFetch) {
        const fetchedSeed = await fetchAndPersistAppTags(blockingAppIdToFetch);
        if (fetchedSeed) {
            resultMap.set(Number(blockingSeedIgdbId), fetchedSeed);
        }
    }

    if (enqueueMissing && toEnqueue.length > 0) {
        toEnqueue.slice(0, maxEnqueue).forEach((appId) => {
            fetchAndPersistAppTags(appId).catch(() => { });
        });
    }

    return resultMap;
};

module.exports = {
    fetchAndPersistAppTags,
    getTaxonomyForIgdbGames,
};