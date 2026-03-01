const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'game_backlog',
    password: 'Santikrdenas2*',
    port: 5432,
});

async function checkDb() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.table(res.rows);
    } catch (err) {
        console.error('Error checking table:', err);
    } finally {
        await pool.end();
    }
}

checkDb();
