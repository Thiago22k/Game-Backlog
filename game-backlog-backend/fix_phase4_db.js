require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixLikesAndComments() {
    try {
        console.log('Fixing collection_likes and collection_comments tables...');

        // Ensure the tables exist with the correct schema
        await pool.query(`
            CREATE TABLE IF NOT EXISTS collection_likes (
                id SERIAL PRIMARY KEY,
                collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_collection_like UNIQUE(collection_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS collection_comments (
                id SERIAL PRIMARY KEY,
                collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Just in case it existed but didn't have ID, we could drop and recreate since it's an empty feature just added
        // Let's drop and recreate them to be 100% sure they match the schema, since they are brand new and have no data yet.
        await pool.query(`
            DROP TABLE IF EXISTS collection_likes;
            DROP TABLE IF EXISTS collection_comments;

            CREATE TABLE collection_likes (
                id SERIAL PRIMARY KEY,
                collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_collection_like UNIQUE(collection_id, user_id)
            );

            CREATE TABLE collection_comments (
                id SERIAL PRIMARY KEY,
                collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Tables recreated successfully with correct schema.');
    } catch (error) {
        console.error('Error fixing tables:', error);
    } finally {
        await pool.end();
    }
}

fixLikesAndComments();
