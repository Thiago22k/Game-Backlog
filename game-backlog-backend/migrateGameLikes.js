require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function runMigration() {
    try {
        console.log("Connecting to database:", process.env.DB_NAME);
        const query = `
            CREATE TABLE IF NOT EXISTS game_likes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                igdb_game_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, igdb_game_id)
            );
            CREATE INDEX IF NOT EXISTS idx_game_likes_igdb_game_id ON game_likes(igdb_game_id);
            CREATE INDEX IF NOT EXISTS idx_game_likes_user_id ON game_likes(user_id);
        `;
        await pool.query(query);
        console.log("Table 'game_likes' created successfully.");

        const res = await pool.query("SELECT to_regclass('public.game_likes') as exists;");
        console.log("Verification status:", res.rows[0]);
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

runMigration();
