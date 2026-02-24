-- Base de datos para Game Backlog
-- Versión: 1.0
-- Fecha: 2024-02-14

-- Crear la base de datos
CREATE DATABASE game_backlog;

-- Conectarse a la base de datos
\c game_backlog;

-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación usuario-juego
CREATE TABLE user_games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    igdb_game_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    rating NUMERIC(3,1) CHECK (rating >= 0.5 AND rating <= 5 AND rating * 2 = FLOOR(rating * 2)),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_game UNIQUE(user_id, igdb_game_id),
    CONSTRAINT valid_status CHECK (status IN ('completed', 'playing', 'wishlist', 'dropped', 'backlog'))
);

-- Índices para mejorar performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_games_user_id ON user_games(user_id);
CREATE INDEX idx_user_games_status ON user_games(status);

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Tabla de usuarios registrados en la aplicación';
COMMENT ON TABLE user_games IS 'Relación entre usuarios y juegos de IGDB con estado y calificación personal';
COMMENT ON COLUMN user_games.igdb_game_id IS 'ID del juego en la API de IGDB';
COMMENT ON COLUMN user_games.status IS 'Estado del juego: completed, playing, wishlist, dropped, backlog';
COMMENT ON COLUMN user_games.rating IS 'Calificación personal de 0.5 a 5 en incrementos de 0.5';

-- Tabla de colecciones
CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para relacionar juegos con colecciones
CREATE TABLE collection_games (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    igdb_game_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_collection_game UNIQUE(collection_id, igdb_game_id)
);

-- Tabla para likes de colecciones (Future usage)
CREATE TABLE collection_likes (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_collection_like UNIQUE(collection_id, user_id)
);

-- Tabla para comentarios en colecciones (Future usage)
CREATE TABLE collection_comments (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices adicionales
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collection_games_collection_id ON collection_games(collection_id);

COMMENT ON TABLE collections IS 'Colecciones (listas) de juegos creadas por usuarios';
COMMENT ON TABLE collection_games IS 'Juegos que pertenecen a una colección';
COMMENT ON TABLE collection_likes IS 'Likes otorgados a colecciones';
COMMENT ON TABLE collection_comments IS 'Comentarios en colecciones';