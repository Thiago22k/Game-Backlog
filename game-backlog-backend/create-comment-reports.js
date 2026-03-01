require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'game_backlog',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT || 5432,
});

const query = `
CREATE TABLE IF NOT EXISTS review_comment_reports (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES review_comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(255) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_id)
);
`;

async function run() {
    try {
        await pool.query(query);
        console.log('review_comment_reports table created!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
