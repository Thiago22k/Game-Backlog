const pool = require('../src/config/database');

async function addBacklogStatus() {
    try {
        console.log('Altering user_games constraint to include backlog...');

        // First we drop the existing constraint
        await pool.query('ALTER TABLE user_games DROP CONSTRAINT IF EXISTS valid_status;');

        // Then add the new constraint with 'backlog'
        await pool.query(`ALTER TABLE user_games ADD CONSTRAINT valid_status CHECK (status IN ('completed', 'playing', 'wishlist', 'dropped', 'backlog'));`);

        console.log('✅ Successfully added backlog to valid_status constraint.');
    } catch (err) {
        console.error('❌ Error updating database constraint:', err);
    } finally {
        pool.end();
    }
}

addBacklogStatus();
