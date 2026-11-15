const axios = require('axios');
const pool = require('../config/database');

const PRICE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const DEFAULT_CC = (process.env.STEAM_STORE_CC || 'US').toUpperCase();
const STEAM_APP_URL_REGEX = /store\.steampowered\.com\/app\/(\d+)/i;

// Extrae steam_appid desde un array websites de IGDB
const extractSteamAppIdFromWebsites = (websites = []) => {
    if (!Array.isArray(websites)) return null;
    for (const w of websites) {
        const url = String(w?.url || '');
        const match = STEAM_APP_URL_REGEX.exec(url);
        if (match) {
            const appId = Number(match[1]);
            if (appId > 0) return appId;
        }
    }
    return null;
};

// Resuelve steam_appid a partir de igdb_game_id usando steam_igdb_map o igdb_cache
const resolveSteamAppId = async (igdbGameId) => {
    const gameId = Number(igdbGameId);
    if (!gameId) return null;

    // 1. Buscar en steam_igdb_map
    const mapRes = await pool.query(
        `SELECT steam_appid
     FROM steam_igdb_map
     WHERE igdb_game_id = $1 AND match_status = 'matched'
     ORDER BY resolved_at DESC
     LIMIT 1`,
        [gameId]
    );
    if (mapRes.rows[0]?.steam_appid) {
        return Number(mapRes.rows[0].steam_appid);
    }

    // 2. Fallback: extraer desde websites cacheados de IGDB (igdb_cache)
    try {
        const cacheRes = await pool.query(
            'SELECT data FROM igdb_cache WHERE igdb_id = $1 LIMIT 1',
            [gameId]
        );
        const websites = cacheRes.rows[0]?.data?.websites;
        const extractedAppId = extractSteamAppIdFromWebsites(websites);

        if (extractedAppId) {
            await pool.query(
                `INSERT INTO steam_igdb_map (steam_appid, igdb_game_id, match_status, resolved_at)
         VALUES ($1, $2, 'matched', CURRENT_TIMESTAMP)
         ON CONFLICT (steam_appid) DO NOTHING`,
                [extractedAppId, gameId]
            ).catch(() => { });
            return extractedAppId;
        }
    } catch {
        // Si la tabla igdb_cache difiere o no tiene fila, continuar sin bloquear
    }

    return null;
};

// Consulta appdetails en lote (hasta 40 appids por llamada) y guarda en steam_price_cache
const fetchAndCacheSteamPricesBatch = async (appIds = [], countryCode = DEFAULT_CC) => {
    const uniqueIds = [...new Set(appIds.map(Number).filter((id) => id > 0))];
    if (!uniqueIds.length) return new Map();

    const cc = (countryCode || DEFAULT_CC).toUpperCase();
    const results = new Map();

    // Dividir en chunks de 35 appids para respetar el límite de URL de Steam Store
    const CHUNK_SIZE = 35;
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);

        try {
            const response = await axios.get('https://store.steampowered.com/api/appdetails', {
                params: {
                    appids: chunk.join(','),
                    filters: chunk.length === 1 ? 'price_overview,release_date,basic' : 'price_overview',
                    cc,
                    l: 'english',
                },
                timeout: 12000,
            });

            const payload = response.data || {};
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                for (const appId of chunk) {
                    const entry = payload[String(appId)];
                    if (!entry || !entry.success || !entry.data) {
                        await client.query(
                            `INSERT INTO steam_price_cache (
                 steam_appid, country_code, available, updated_at
               )
               VALUES ($1, $2, false, CURRENT_TIMESTAMP)
               ON CONFLICT (steam_appid, country_code) DO UPDATE SET
                 available = false,
                 updated_at = CURRENT_TIMESTAMP`,
                            [appId, cc]
                        );
                        continue;
                    }

                    const info = entry.data;
                    const po = info.price_overview || null;
                    const isFree = Boolean(info.is_free);
                    const comingSoon = Boolean(info.release_date?.coming_soon);

                    const row = {
                        steam_appid: appId,
                        country_code: cc,
                        currency: po?.currency || null,
                        initial_price: po?.initial ?? null,
                        final_price: po?.final ?? null,
                        discount_percent: Number(po?.discount_percent || 0),
                        initial_formatted: po?.initial_formatted || null,
                        final_formatted: po?.final_formatted || null,
                        is_free: isFree,
                        coming_soon: comingSoon,
                        available: true,
                    };

                    await client.query(
                        `INSERT INTO steam_price_cache (
               steam_appid, country_code, currency, initial_price, final_price,
               discount_percent, initial_formatted, final_formatted, is_free, coming_soon, available, updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, CURRENT_TIMESTAMP)
             ON CONFLICT (steam_appid, country_code) DO UPDATE SET
               currency = EXCLUDED.currency,
               initial_price = EXCLUDED.initial_price,
               final_price = EXCLUDED.final_price,
               discount_percent = EXCLUDED.discount_percent,
               initial_formatted = EXCLUDED.initial_formatted,
               final_formatted = EXCLUDED.final_formatted,
               is_free = EXCLUDED.is_free,
               coming_soon = EXCLUDED.coming_soon,
               available = true,
               updated_at = CURRENT_TIMESTAMP`,
                        [
                            row.steam_appid,
                            row.country_code,
                            row.currency,
                            row.initial_price,
                            row.final_price,
                            row.discount_percent,
                            row.initial_formatted,
                            row.final_formatted,
                            row.is_free,
                            row.coming_soon,
                        ]
                    );

                    results.set(appId, row);
                }

                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.warn('⚠️ Error consultando precios de Steam Store:', err.message);
        }
    }

    return results;
};

// Obtiene precio de un juego de IGDB (usa caché de 6h antes de llamar a Steam Store)
const getPriceForIgdbGame = async (igdbGameId, { countryCode = DEFAULT_CC, fallbackAppId = null } = {}) => {
    const cc = (countryCode || DEFAULT_CC).toUpperCase();
    const parsedFallback = Number(fallbackAppId) || null;
    const appId = parsedFallback || (await resolveSteamAppId(igdbGameId));

    if (!appId) {
        return { available: false, steam_appid: null };
    }

    // Si vino desde el frontend (websites de IGDB), persistirlo en steam_igdb_map para futuras alertas/logros
    if (parsedFallback && Number(igdbGameId)) {
        pool.query(
            `INSERT INTO steam_igdb_map (steam_appid, igdb_game_id, match_status, resolved_at)
       VALUES ($1, $2, 'matched', CURRENT_TIMESTAMP)
       ON CONFLICT (steam_appid) DO NOTHING`,
            [parsedFallback, Number(igdbGameId)]
        ).catch(() => { });
    }

    const cachedRes = await pool.query(
        'SELECT * FROM steam_price_cache WHERE steam_appid = $1 AND country_code = $2',
        [appId, cc]
    );
    const cached = cachedRes.rows[0];

    const isFresh =
        cached && cached.updated_at && Date.now() - new Date(cached.updated_at).getTime() < PRICE_CACHE_TTL_MS;

    let priceRow = isFresh ? cached : null;

    if (!priceRow) {
        const freshMap = await fetchAndCacheSteamPricesBatch([appId], cc);
        priceRow = freshMap.get(appId) || cached || null;
    }

    const storeUrl = `https://store.steampowered.com/app/${appId}/`;

    if (!priceRow || priceRow.available === false) {
        return {
            available: false,
            steam_appid: appId,
            store_url: storeUrl,
        };
    }

    return {
        available: true,
        steam_appid: appId,
        store_url: storeUrl,
        currency: priceRow.currency,
        initial_price: priceRow.initial_price,
        final_price: priceRow.final_price,
        discount_percent: Number(priceRow.discount_percent || 0),
        initial_formatted: priceRow.initial_formatted,
        final_formatted: priceRow.final_formatted,
        is_free: Boolean(priceRow.is_free),
        coming_soon: Boolean(priceRow.coming_soon),
    };
};

module.exports = {
    extractSteamAppIdFromWebsites,
    resolveSteamAppId,
    fetchAndCacheSteamPricesBatch,
    getPriceForIgdbGame,
};