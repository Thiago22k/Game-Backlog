require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function createTable() {
    try {
        console.log("Connecting to database:", process.env.DB_NAME);
        const query = `
            CREATE TABLE IF NOT EXISTS igdb_cache (
                igdb_id INTEGER PRIMARY KEY,
                slug VARCHAR(255) UNIQUE,
                name VARCHAR(255),
                data JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_igdb_cache_slug ON igdb_cache(slug);
            CREATE INDEX IF NOT EXISTS idx_igdb_cache_updated_at ON igdb_cache(updated_at);
        `;
        await pool.query(query);
        console.log("Table 'igdb_cache' created successfully.");
    } catch (err) {
        console.error("Failed to create table:", err);
    } finally {
        await pool.end();
    }
}

createTable();
