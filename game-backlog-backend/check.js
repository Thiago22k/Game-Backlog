const pool = require('./src/config/database');

async function checkLogs() {
    try {
        const result = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5;');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Query failed:", err);
        process.exit(1);
    }
}

checkLogs();
