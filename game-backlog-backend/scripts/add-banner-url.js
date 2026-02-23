const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function addBannerUrlColumn() {
    try {
        console.log('Adding banner_url column to users table...');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url VARCHAR(255);');
        console.log('Successfully added banner_url column.');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        pool.end();
    }
}

addBannerUrlColumn();
