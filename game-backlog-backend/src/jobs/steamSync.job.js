const pool = require('../config/database');
const SteamAccount = require('../models/steam.model');
const steamSyncService = require('../services/steamSync.service');

const ADVISORY_LOCK_ID = 94827104;
const RUN_INTERVAL_MS = 6 * 60 * 60 * 1000; // Cada 6 horas
const INITIAL_DELAY_MS = 60 * 1000; // Esperar 1 minuto tras arrancar el servidor
const BATCH_SIZE = 20;
const PER_USER_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runSteamAutoSyncBatch = async () => {
    const client = await pool.connect();
    let lockAcquired = false;

    try {
        const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [ADVISORY_LOCK_ID]);
        lockAcquired = lockRes.rows[0]?.locked === true;

        if (!lockAcquired) {
            return;
        }

        const accounts = await SteamAccount.getAccountsDueForAutoSync(BATCH_SIZE);
        if (!accounts.length) {
            return;
        }

        console.log(`🔄 [Steam Auto-Sync] Sincronizando ${accounts.length} cuenta(s)...`);

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            if (i > 0) await sleep(PER_USER_DELAY_MS);

            try {
                await steamSyncService.syncUserSteamLibrary(account.user_id, {
                    enforceCooldown: false,
                    importNewGames: true,
                });
            } catch (err) {
                console.warn(`⚠️ [Steam Auto-Sync] Falló para user_id=${account.user_id}:`, err.message);
            }
        }

        console.log('✅ [Steam Auto-Sync] Lote completado.');
    } catch (err) {
        console.error('❌ [Steam Auto-Sync] Error general:', err.message);
    } finally {
        if (lockAcquired) {
            await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]).catch(() => { });
        }
        client.release();
    }
};

const startSteamSyncScheduler = () => {
    if (!process.env.STEAM_API_KEY) {
        console.warn('⚠️ STEAM_API_KEY no configurada; el auto-sync de Steam queda desactivado.');
        return;
    }

    setTimeout(() => {
        runSteamAutoSyncBatch();
    }, INITIAL_DELAY_MS);

    setInterval(() => {
        runSteamAutoSyncBatch();
    }, RUN_INTERVAL_MS);
};

module.exports = {
    startSteamSyncScheduler,
    runSteamAutoSyncBatch,
};