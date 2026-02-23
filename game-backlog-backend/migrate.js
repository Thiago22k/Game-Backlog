const pool = require('./src/config/database');

async function createTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action_type VARCHAR(50) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(100),
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
        `;
        await pool.query(query);
        console.log("Table created successfully via pool");
        process.exit(0);
    } catch (err) {
        console.error("Error creating table", err);
        process.exit(1);
    }
}

createTable();
