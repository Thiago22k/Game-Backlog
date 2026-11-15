const pool = require('../config/database');
const steamPriceService = require('../services/steamPrice.service');
const Notification = require('../models/notification.model');

const ADVISORY_LOCK_ID = 94827105;
const RUN_INTERVAL_MS = 12 * 60 * 60 * 1000; // Cada 12 horas
const INITIAL_DELAY_MS = 2 * 60 * 1000; // Cada 2 minutos

const runWishlistSaleCheck = async () => {
    const client = await pool.connect();
    let lockAcquired = false;

    try {
        const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [ADVISORY_LOCK_ID]);
        lockAcquired = lockRes.rows[0]?.locked === true;
        if (!lockAcquired) return;

        // 1. Obtener todos los juegos en wishlist del usuario (tengan o no steam_appid guardado)
        const wishlistRes = await client.query(`
      SELECT DISTINCT
        ug.user_id,
        ug.igdb_game_id,
        COALESCE(ug.steam_appid, sim.steam_appid) AS steam_appid
      FROM user_games ug
      LEFT JOIN steam_igdb_map sim
        ON sim.igdb_game_id = ug.igdb_game_id AND sim.match_status = 'matched'
      WHERE ug.status = 'wishlist'
    `);

        // Resolver steam_appid desde igdb_cache->websites si aún no estaba en steam_igdb_map
        const resolvedRows = [];
        for (const r of wishlistRes.rows) {
            let appId = r.steam_appid ? Number(r.steam_appid) : null;
            if (!appId) {
                appId = await steamPriceService.resolveSteamAppId(r.igdb_game_id);
            }
            if (appId) {
                resolvedRows.push({
                    user_id: Number(r.user_id),
                    igdb_game_id: Number(r.igdb_game_id),
                    steam_appid: appId,
                });
            }
        }

        if (!resolvedRows.length) {
            console.log('ℹ️ [Steam Wishlist Alerts] No hay juegos en wishlist con steam_appid mapeado.');
            return;
        }

        // Obtener nombre y slug desde igdb_cache para enriquecer la notificación
        const gameMetaById = new Map();
        try {
            const igdbIds = [...new Set(resolvedRows.map((r) => r.igdb_game_id))];
            const metaRes = await pool.query(
                `SELECT igdb_id, name, slug, data->'cover'->>'image_id' AS cover_image_id
         FROM igdb_cache
         WHERE igdb_id = ANY($1::int[])`,
                [igdbIds]
            );
            for (const m of metaRes.rows) {
                gameMetaById.set(Number(m.igdb_id), m);
            }
        } catch (metaErr) {
            console.warn('⚠️ [Steam Wishlist Alerts] No se pudo leer igdb_cache:', metaErr.message);
        }

        const rows = resolvedRows.map((r) => {
            const meta = gameMetaById.get(r.igdb_game_id) || {};
            return {
                ...r,
                game_name: meta.name || null,
                game_slug: meta.slug || null,
                cover_image_id: meta.cover_image_id || null,
            };
        });

        const uniqueAppIds = [...new Set(rows.map((r) => r.steam_appid).filter(Boolean))];
        console.log(`🏷️ [Steam Wishlist Alerts] Revisando precios de ${uniqueAppIds.length} juego(s)...`);

        // 2. Consultar precios en lote y actualizar steam_price_cache
        const pricesMap = await steamPriceService.fetchAndCacheSteamPricesBatch(uniqueAppIds);

        // 3. Cargar historial previo de alertas enviadas
        const alertsRes = await pool.query('SELECT user_id, steam_appid, last_notified_discount FROM wishlist_price_alerts');
        const alertHistory = new Map(
            alertsRes.rows.map((a) => [`${a.user_id}:${a.steam_appid}`, Number(a.last_notified_discount || 0)])
        );

        let notificationsSent = 0;

        for (const row of rows) {
            const userId = row.user_id;
            const appId = row.steam_appid;
            const igdbGameId = row.igdb_game_id;
            const priceInfo = pricesMap.get(appId);

            if (!priceInfo || !priceInfo.available) continue;

            const currentDiscount = Number(priceInfo.discount_percent || 0);
            const key = `${userId}:${appId}`;
            const prevDiscount = alertHistory.get(key) ?? 0;

            // Si dejó de estar en oferta, resetear registro para futura campaña de descuentos
            if (currentDiscount <= 0) {
                if (prevDiscount > 0) {
                    await pool.query(
                        'DELETE FROM wishlist_price_alerts WHERE user_id = $1 AND steam_appid = $2',
                        [userId, appId]
                    );
                }
                continue;
            }

            // Evitar duplicados si ya se notificó este mismo porcentaje (o uno mayor) en esta oferta
            if (currentDiscount <= prevDiscount) {
                continue;
            }

            await Notification.createNotification({
                recipientId: userId,
                actorId: null,
                type: 'STEAM_WISHLIST_SALE',
                entityId: String(igdbGameId),
                metadata: {
                    steam_appid: appId,
                    igdb_game_id: igdbGameId,
                    game_name: row.game_name || 'A game in your wishlist',
                    game_slug: row.game_slug || String(igdbGameId),
                    cover_image_id: row.cover_image_id || null,
                    discount_percent: currentDiscount,
                    initial_formatted: priceInfo.initial_formatted || null,
                    final_formatted: priceInfo.final_formatted || null,
                    currency: priceInfo.currency || 'USD',
                    store_url: `https://store.steampowered.com/app/${appId}/`,
                },
            });

            await pool.query(
                `INSERT INTO wishlist_price_alerts (user_id, steam_appid, igdb_game_id, last_notified_discount, last_notified_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, steam_appid) DO UPDATE SET
           last_notified_discount = EXCLUDED.last_notified_discount,
           last_notified_at = CURRENT_TIMESTAMP`,
                [userId, appId, igdbGameId, currentDiscount]
            );

            notificationsSent++;
        }

        if (notificationsSent > 0) {
            console.log(`🔔 [Steam Wishlist Alerts] ${notificationsSent} alerta(s) de oferta enviadas.`);
        }
    } catch (err) {
        console.error('❌ [Steam Wishlist Alerts] Error:', err.message);
    } finally {
        if (lockAcquired) {
            await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]).catch(() => { });
        }
        client.release();
    }
};

const startWishlistSaleScheduler = () => {
    setTimeout(() => {
        runWishlistSaleCheck();
    }, INITIAL_DELAY_MS);

    setInterval(() => {
        runWishlistSaleCheck();
    }, RUN_INTERVAL_MS);
};

module.exports = {
    startWishlistSaleScheduler,
    runWishlistSaleCheck,
};