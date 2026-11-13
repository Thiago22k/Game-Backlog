-- =============================================================================
-- 001 — Steam integration (fase 1: base y vinculación)
-- Solo cambios ADITIVOS e idempotentes: se puede ejecutar varias veces y no
-- modifica datos existentes. Los ALTER de users.password / users.email a
-- NULLABLE (registro solo-Steam) van en la migración 002 (fase 2).
--
-- Uso:  psql -U postgres -d game_backlog -f migrations/001_steam_integration.sql
-- =============================================================================

BEGIN;

-- Vinculación: una cuenta Steam por usuario y un usuario por cuenta Steam
CREATE TABLE IF NOT EXISTS steam_accounts (
    id                SERIAL PRIMARY KEY,
    user_id           INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    steam_id64        VARCHAR(20) NOT NULL UNIQUE,
    persona_name      TEXT,
    avatar_url        TEXT,
    profile_url       TEXT,
    library_visible   BOOLEAN,                       -- NULL = desconocido
    auto_sync         BOOLEAN NOT NULL DEFAULT false,
    last_sync_at      TIMESTAMPTZ,
    last_sync_status  VARCHAR(20),                   -- 'ok' | 'private' | 'error'
    linked_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Caché global appid de Steam -> juego de IGDB (compartida entre usuarios)
CREATE TABLE IF NOT EXISTS steam_igdb_map (
    steam_appid   INT PRIMARY KEY,
    igdb_game_id  INT,                               -- NULL = sin match
    match_status  VARCHAR(20) NOT NULL,              -- 'matched' | 'needs_review' | 'unmatched' | 'skipped_dlc'
    resolved_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Espejo de la biblioteca de Steam por usuario
CREATE TABLE IF NOT EXISTS steam_library (
    user_id                INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    steam_appid            INT NOT NULL,
    name                   TEXT,
    playtime_minutes       INT NOT NULL DEFAULT 0,
    playtime_2weeks_min    INT NOT NULL DEFAULT 0,
    last_played_at         TIMESTAMPTZ,
    achievements_total     INT,
    achievements_unlocked  INT,
    ignored                BOOLEAN NOT NULL DEFAULT false,   -- el usuario lo quitó: no reimportar
    last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, steam_appid)
);

CREATE INDEX IF NOT EXISTS idx_steam_library_user ON steam_library(user_id);

-- Origen y datos de Steam en la lista del usuario (lo existente queda 'manual')
ALTER TABLE user_games
    ADD COLUMN IF NOT EXISTS source            VARCHAR(10) NOT NULL DEFAULT 'manual',  -- 'manual' | 'steam'
    ADD COLUMN IF NOT EXISTS status_set_by     VARCHAR(10) NOT NULL DEFAULT 'user',    -- 'user' | 'steam'
    ADD COLUMN IF NOT EXISTS steam_appid       INT,
    ADD COLUMN IF NOT EXISTS playtime_minutes  INT,
    ADD COLUMN IF NOT EXISTS last_played_at    TIMESTAMPTZ;

-- Logros (se usan en la fase 6; se crean ya para no migrar de nuevo)
CREATE TABLE IF NOT EXISTS steam_achievement_schema (
    steam_appid     INT NOT NULL,
    api_name        TEXT NOT NULL,
    display_name    TEXT,
    description     TEXT,
    icon_url        TEXT,
    icon_gray_url   TEXT,
    hidden          BOOLEAN NOT NULL DEFAULT false,
    global_percent  NUMERIC(5,2),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (steam_appid, api_name)
);

CREATE TABLE IF NOT EXISTS user_steam_achievements (
    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    steam_appid  INT NOT NULL,
    api_name     TEXT NOT NULL,
    unlocked     BOOLEAN NOT NULL DEFAULT false,
    unlocked_at  TIMESTAMPTZ,
    PRIMARY KEY (user_id, steam_appid, api_name)
);

COMMIT;
