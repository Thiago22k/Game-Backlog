const pool = require('../config/database');
const SteamAccount = require('../models/steam.model');
const steamService = require('./steam.service');
const steamPriceService = require('./steamPrice.service');

const SCHEMA_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const USER_PROGRESS_TTL_MS = 45 * 60 * 1000; // 45 minutos

// Resuelve el steam_appid a partir del igdb_game_id (prioriza el del usuario, luego steam_igdb_map y finalmente igdb_cache)
const resolveSteamAppIdForGame = async (igdbGameId, userId = null) => {
    const gameId = Number(igdbGameId);
    if (!gameId) return null;

    if (userId) {
        const userRes = await pool.query(
            'SELECT steam_appid FROM user_games WHERE user_id = $1 AND igdb_game_id = $2 AND steam_appid IS NOT NULL LIMIT 1',
            [userId, gameId]
        );
        if (userRes.rows[0]?.steam_appid) {
            return Number(userRes.rows[0].steam_appid);
        }
    }

    return steamPriceService.resolveSteamAppId(gameId);
};

// Obtiene o refresca el esquema global de logros de un steam_appid
const getOrFetchGameSchema = async (appId, forceRefresh = false) => {
    const existingRes = await pool.query(
        'SELECT * FROM steam_achievement_schema WHERE steam_appid = $1 ORDER BY global_percent DESC NULLS LAST, display_name ASC',
        [appId]
    );

    const rows = existingRes.rows;
    const newestUpdate = rows.reduce((max, r) => {
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return t > max ? t : max;
    }, 0);

    const isFresh = rows.length > 0 && !forceRefresh && Date.now() - newestUpdate < SCHEMA_TTL_MS;
    if (isFresh) {
        return rows;
    }

    const [schemaList, globalPercentages] = await Promise.all([
        steamService.getSchemaForGame(appId),
        steamService.getGlobalAchievementPercentages(appId),
    ]);

    if (!schemaList.length) {
        return rows;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const upsertQuery = `
      INSERT INTO steam_achievement_schema (
        steam_appid, api_name, display_name, description, icon_url, icon_gray_url, hidden, global_percent, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (steam_appid, api_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_url = EXCLUDED.icon_url,
        icon_gray_url = EXCLUDED.icon_gray_url,
        hidden = EXCLUDED.hidden,
        global_percent = COALESCE(EXCLUDED.global_percent, steam_achievement_schema.global_percent),
        updated_at = CURRENT_TIMESTAMP
    `;

        for (const item of schemaList) {
            const pct = globalPercentages.has(item.api_name) ? globalPercentages.get(item.api_name) : null;
            await client.query(upsertQuery, [
                appId,
                item.api_name,
                item.display_name,
                item.description,
                item.icon_url,
                item.icon_gray_url,
                item.hidden,
                pct,
            ]);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    const refreshedRes = await pool.query(
        'SELECT * FROM steam_achievement_schema WHERE steam_appid = $1 ORDER BY global_percent DESC NULLS LAST, display_name ASC',
        [appId]
    );
    return refreshedRes.rows;
};

// Sincroniza y devuelve el progreso del usuario para ese steam_appid
const getOrFetchUserProgress = async (userId, steamId64, appId, forceRefresh = false) => {
    // Comprobar última actualización en user_steam_achievements o steam_library
    const libRes = await pool.query(
        'SELECT achievements_total, achievements_unlocked, last_seen_at FROM steam_library WHERE user_id = $1 AND steam_appid = $2',
        [userId, appId]
    );

    const cachedUserRes = await pool.query(
        'SELECT api_name, unlocked, unlocked_at FROM user_steam_achievements WHERE user_id = $1 AND steam_appid = $2',
        [userId, appId]
    );

    // Guardamos timestamp de última sincronización de logros usando una marca ligera en memoria por (userId:appId)
    const cacheKey = `${userId}:${appId}`;
    const lastFetched = recentAchievementFetches.get(cacheKey) || 0;
    const hasCachedRows = cachedUserRes.rows.length > 0;

    if (hasCachedRows && !forceRefresh && Date.now() - lastFetched < USER_PROGRESS_TTL_MS) {
        return {
            synced: true,
            progressByApiName: new Map(cachedUserRes.rows.map((r) => [r.api_name, r])),
        };
    }

    const playerResult = await steamService.getPlayerAchievements(steamId64, appId);
    if (!playerResult.available) {
        // Si ya había datos previos cacheados, devolverlos como respaldo
        if (hasCachedRows) {
            return {
                synced: true,
                progressByApiName: new Map(cachedUserRes.rows.map((r) => [r.api_name, r])),
            };
        }
        return { synced: false, progressByApiName: new Map() };
    }

    const client = await pool.connect();
    let unlockedCount = 0;

    try {
        await client.query('BEGIN');

        const upsertUserQuery = `
      INSERT INTO user_steam_achievements (user_id, steam_appid, api_name, unlocked, unlocked_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, steam_appid, api_name) DO UPDATE SET
        unlocked = EXCLUDED.unlocked,
        unlocked_at = COALESCE(EXCLUDED.unlocked_at, user_steam_achievements.unlocked_at)
    `;

        for (const ach of playerResult.achievements) {
            if (ach.unlocked) unlockedCount++;
            await client.query(upsertUserQuery, [
                userId,
                appId,
                ach.api_name,
                ach.unlocked,
                ach.unlocked_at,
            ]);
        }

        if (libRes.rows.length > 0) {
            await client.query(
                `UPDATE steam_library
         SET achievements_total = $3,
             achievements_unlocked = $4
         WHERE user_id = $1 AND steam_appid = $2`,
                [userId, appId, playerResult.achievements.length, unlockedCount]
            );
        }

        await client.query('COMMIT');
        recentAchievementFetches.set(cacheKey, Date.now());
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    const updatedRows = await pool.query(
        'SELECT api_name, unlocked, unlocked_at FROM user_steam_achievements WHERE user_id = $1 AND steam_appid = $2',
        [userId, appId]
    );

    return {
        synced: true,
        progressByApiName: new Map(updatedRows.rows.map((r) => [r.api_name, r])),
    };
};

const recentAchievementFetches = new Map();

// Endpoint principal: devuelve esquema + progreso del usuario (si tiene Steam vinculado)
const getGameAchievements = async (igdbGameId, { userId = null, forceRefresh = false } = {}) => {
    const appId = await resolveSteamAppIdForGame(igdbGameId, userId);

    if (!appId) {
        return {
            supported: false,
            steam_appid: null,
            user_linked: false,
            user_synced: false,
            summary: { total: 0, unlocked: 0, percent: 0, rare_unlocked: 0, rare_total: 0 },
            achievements: [],
        };
    }

    const schemaRows = await getOrFetchGameSchema(appId, forceRefresh);

    if (!schemaRows.length) {
        return {
            supported: false,
            steam_appid: appId,
            user_linked: false,
            user_synced: false,
            summary: { total: 0, unlocked: 0, percent: 0, rare_unlocked: 0, rare_total: 0 },
            achievements: [],
        };
    }

    let userLinked = false;
    let userSynced = false;
    let progressMap = new Map();

    if (userId) {
        const steamAccount = await SteamAccount.findByUserId(userId);
        if (steamAccount) {
            userLinked = true;
            const userProg = await getOrFetchUserProgress(
                userId,
                steamAccount.steam_id64,
                appId,
                forceRefresh
            );
            userSynced = userProg.synced;
            progressMap = userProg.progressByApiName;
        }
    }

    let unlockedCount = 0;
    let rareTotal = 0;
    let rareUnlocked = 0;

    const achievements = schemaRows.map((row) => {
        const userEntry = progressMap.get(row.api_name);
        const unlocked = Boolean(userEntry?.unlocked);
        const globalPercent = row.global_percent !== null ? Number(row.global_percent) : null;
        const isRare = globalPercent !== null && globalPercent <= 10;

        if (unlocked) unlockedCount++;
        if (isRare) {
            rareTotal++;
            if (unlocked) rareUnlocked++;
        }

        return {
            api_name: row.api_name,
            display_name: row.display_name,
            description: row.description,
            icon_url: row.icon_url,
            icon_gray_url: row.icon_gray_url,
            hidden: Boolean(row.hidden),
            global_percent: globalPercent,
            is_rare: isRare,
            unlocked,
            unlocked_at: userEntry?.unlocked_at || null,
        };
    });

    // Ordenar: si el usuario tiene progreso, desbloqueados recientes primero y luego por rareza/popularidad
    if (userSynced) {
        achievements.sort((a, b) => {
            if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
            if (a.unlocked && b.unlocked) {
                const ta = a.unlocked_at ? new Date(a.unlocked_at).getTime() : 0;
                const tb = b.unlocked_at ? new Date(b.unlocked_at).getTime() : 0;
                if (ta !== tb) return tb - ta;
            }
            return (b.global_percent ?? -1) - (a.global_percent ?? -1);
        });
    }

    const total = achievements.length;
    const percent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

    return {
        supported: true,
        steam_appid: appId,
        user_linked: userLinked,
        user_synced: userSynced,
        summary: {
            total,
            unlocked: unlockedCount,
            percent,
            rare_unlocked: rareUnlocked,
            rare_total: rareTotal,
        },
        achievements,
    };
};

const getUserAchievementsSummaryByUsername = async (username) => {
    const userRes = await pool.query(
        'SELECT id, is_profile_public FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
        [username]
    );
    const user = userRes.rows[0];
    if (!user) return { linked: false, total_unlocked: 0, rare_unlocked: 0, games_with_achievements: 0, rarest_achievements: [] };

    const steamAcc = await SteamAccount.findByUserId(user.id);
    if (!steamAcc) {
        return { linked: false, total_unlocked: 0, rare_unlocked: 0, games_with_achievements: 0, rarest_achievements: [] };
    }

    const statsRes = await pool.query(
        `SELECT
       COUNT(*) FILTER (WHERE usa.unlocked = true)::int AS total_unlocked,
       COUNT(*) FILTER (WHERE usa.unlocked = true AND sas.global_percent IS NOT NULL AND sas.global_percent <= 10)::int AS rare_unlocked,
       COUNT(DISTINCT usa.steam_appid) FILTER (WHERE usa.unlocked = true)::int AS games_with_achievements
     FROM user_steam_achievements usa
     LEFT JOIN steam_achievement_schema sas
       ON sas.steam_appid = usa.steam_appid AND sas.api_name = usa.api_name
     WHERE usa.user_id = $1`,
        [user.id]
    );

    const rarestRes = await pool.query(
        `SELECT
       usa.steam_appid,
       usa.api_name,
       usa.unlocked_at,
       sas.display_name,
       sas.description,
       sas.icon_url,
       sas.global_percent,
       ic.name AS game_name,
       ic.slug AS game_slug,
       sim.igdb_game_id
     FROM user_steam_achievements usa
     JOIN steam_achievement_schema sas
       ON sas.steam_appid = usa.steam_appid AND sas.api_name = usa.api_name
     LEFT JOIN steam_igdb_map sim
       ON sim.steam_appid = usa.steam_appid AND sim.match_status = 'matched'
     LEFT JOIN igdb_cache ic
       ON ic.igdb_id = sim.igdb_game_id
     WHERE usa.user_id = $1
       AND usa.unlocked = true
       AND sas.global_percent IS NOT NULL
     ORDER BY sas.global_percent ASC, usa.unlocked_at DESC NULLS LAST
     LIMIT 4`,
        [user.id]
    );

    const row = statsRes.rows[0] || {};
    return {
        linked: true,
        total_unlocked: Number(row.total_unlocked || 0),
        rare_unlocked: Number(row.rare_unlocked || 0),
        games_with_achievements: Number(row.games_with_achievements || 0),
        rarest_achievements: rarestRes.rows.map((r) => ({
            ...r,
            global_percent: r.global_percent !== null ? Number(r.global_percent) : null,
        })),
    };
};

module.exports = {
    getGameAchievements,
    getUserAchievementsSummaryByUsername
};