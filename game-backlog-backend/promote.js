const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'game_backlog',
    password: 'Santikrdenas2*',
    port: 5432,
});

async function promoteAdmin() {
    try {
        await pool.query('UPDATE users SET role = $1 WHERE username = $2', ['admin', 'admin']);
        console.log('User "admin" promoted successfully.');
    } catch (err) {
        console.error('Error promoting admin:', err);
    } finally {
        await pool.end();
    }
}

promoteAdmin();
