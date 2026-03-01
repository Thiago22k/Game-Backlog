require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'game_backlog',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        await pool.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';");
        console.log('Done!');
    } catch (e) {
        if (e.code === '42701') {
            console.log('Column already exists');
        } else {
            console.error(e);
        }
    } finally {
        await pool.end();
    }
}
run();
