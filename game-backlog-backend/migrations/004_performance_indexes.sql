BEGIN;

-- user_games: consultas de perfil (getUserGames) y estadísticas comunitarias (getGameStats)
CREATE INDEX IF NOT EXISTS idx_user_games_user_status_created
    ON user_games (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_games_igdb_status
    ON user_games (igdb_game_id, status);

CREATE INDEX IF NOT EXISTS idx_user_games_steam_appid
    ON user_games (steam_appid)
    WHERE steam_appid IS NOT NULL;

-- steam_igdb_map: resolución inversa igdb_game_id -> steam_appid (precios, logros, wishlist alerts)
CREATE INDEX IF NOT EXISTS idx_steam_igdb_map_igdb_status
    ON steam_igdb_map (igdb_game_id, match_status)
    WHERE igdb_game_id IS NOT NULL;

-- user_steam_achievements: resumen de logros desbloqueados y rareza en ProfileStats
CREATE INDEX IF NOT EXISTS idx_user_steam_achievements_user_unlocked
    ON user_steam_achievements (user_id, steam_appid)
    WHERE unlocked = true;

-- steam_accounts: scheduler periódico de sincronización automática
CREATE INDEX IF NOT EXISTS idx_steam_accounts_auto_sync
    ON steam_accounts (auto_sync, last_sync_at)
    WHERE auto_sync = true;

-- Tablas comunitarias consultadas por Game.getGameStats y perfiles
CREATE INDEX IF NOT EXISTS idx_game_likes_igdb
    ON game_likes (igdb_game_id);

CREATE INDEX IF NOT EXISTS idx_reviews_igdb
    ON reviews (igdb_game_id);

CREATE INDEX IF NOT EXISTS idx_collection_games_igdb
    ON collection_games (igdb_game_id);

COMMIT;