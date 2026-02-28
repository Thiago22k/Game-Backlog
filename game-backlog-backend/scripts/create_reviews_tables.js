const pool = require('../src/config/database');

const run = async () => {
    try {
        await pool.query(`
        -- Tabla de reseñas
        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            igdb_game_id INTEGER NOT NULL,
            rating NUMERIC(2,1) CHECK (rating >= 0.5 AND rating <= 5 AND rating * 2 = FLOOR(rating * 2)),
            status VARCHAR(20) NOT NULL,
            sub_status VARCHAR(50),
            platform VARCHAR(100),
            contains_spoiler BOOLEAN DEFAULT false,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_user_review UNIQUE(user_id, igdb_game_id)
        );

        -- Tabla de likes en las reseñas
        CREATE TABLE IF NOT EXISTS review_likes (
            id SERIAL PRIMARY KEY,
            review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_review_like UNIQUE(review_id, user_id)
        );

        -- Respuestas a las reseñas
        CREATE TABLE IF NOT EXISTS review_comments (
            id SERIAL PRIMARY KEY,
            review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Reportes de reseñas
        CREATE TABLE IF NOT EXISTS review_reports (
            id SERIAL PRIMARY KEY,
            review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reason VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Índices para reseñas
        CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON reviews(igdb_game_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
        `);
        console.log("Tables created successfully.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
