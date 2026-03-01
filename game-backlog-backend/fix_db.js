const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'game_backlog',
    password: 'Santikrdenas2*',
    port: 5432,
});

async function fixDb() {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;');
        console.log('Column "is_banned" added to users table successfully.');
    } catch (err) {
        console.error('Error altering table:', err);
    } finally {
        await pool.end();
    }
}

fixDb();
