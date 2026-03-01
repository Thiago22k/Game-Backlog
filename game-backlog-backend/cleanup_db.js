const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'game_backlog',
    password: 'Santikrdenas2*',
    port: 5432,
});

async function cleanupDb() {
    try {
        await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS is_banned;');
        console.log('Column "is_banned" removed from users table successfully.');
    } catch (err) {
        console.error('Error altering table:', err);
    } finally {
        await pool.end();
    }
}

cleanupDb();
