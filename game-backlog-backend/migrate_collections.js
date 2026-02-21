require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(100) NOT NULL,
          description TEXT,
          is_public BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS collection_games (
          id SERIAL PRIMARY KEY,
          collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
          igdb_game_id INTEGER NOT NULL,
          sort_order INTEGER DEFAULT 0,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_collection_game UNIQUE(collection_id, igdb_game_id)
      );

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

      CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
      CREATE INDEX IF NOT EXISTS idx_collection_games_collection_id ON collection_games(collection_id);
    `);
        console.log('Tables created successfully.');
    } catch (error) {
        console.error('Error creating tables:', error);
    } finally {
        await pool.end();
    }
}

run();
