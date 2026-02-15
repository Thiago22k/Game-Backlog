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
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_game UNIQUE(user_id, igdb_game_id),
    CONSTRAINT valid_status CHECK (status IN ('completed', 'playing', 'wishlist', 'dropped'))
);

-- Índices para mejorar performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_games_user_id ON user_games(user_id);
CREATE INDEX idx_user_games_status ON user_games(status);

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Tabla de usuarios registrados en la aplicación';
COMMENT ON TABLE user_games IS 'Relación entre usuarios y juegos de IGDB con estado y calificación personal';
COMMENT ON COLUMN user_games.igdb_game_id IS 'ID del juego en la API de IGDB';
COMMENT ON COLUMN user_games.status IS 'Estado del juego: completed, playing, wishlist, dropped';
COMMENT ON COLUMN user_games.rating IS 'Calificación personal del 1 al 5';