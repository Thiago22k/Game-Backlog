-- =============================================================================
-- Stackd / Game Backlog — Complete Database Schema (PostgreSQL)
-- Generated from project source code analysis
-- =============================================================================

-- Run this file against a fresh PostgreSQL database to bootstrap all tables,
-- indices, and constraints required by the application.

BEGIN;

-- =============================================================================
-- 1. USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id                   SERIAL PRIMARY KEY,
    username             VARCHAR(15) NOT NULL UNIQUE,
    email                VARCHAR(255) NOT NULL UNIQUE,
    password             TEXT NOT NULL,
    role                 VARCHAR(20) NOT NULL DEFAULT 'user',      -- 'user' | 'admin' | 'moderator'
    status               VARCHAR(20) NOT NULL DEFAULT 'active',    -- 'active' | 'banned'
    is_profile_public    BOOLEAN NOT NULL DEFAULT true,
    avatar_url           TEXT,
    avatar_static_url    TEXT,
    banner_url           TEXT,
    bio                  TEXT,
    social_twitch        TEXT,
    social_discord       TEXT,
    social_steam         TEXT,
    last_username_change TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. USER_GAMES  (backlog / tracking per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_games (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    igdb_game_id  INT NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'completed',  -- 'playing' | 'completed' | 'backlog' | 'wishlist' | 'dropped'
    rating        NUMERIC(2,1),                               -- 0.5 – 5.0 in 0.5 steps
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, igdb_game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_games_user_id      ON user_games(user_id);
CREATE INDEX IF NOT EXISTS idx_user_games_igdb_game_id  ON user_games(igdb_game_id);
CREATE INDEX IF NOT EXISTS idx_user_games_status        ON user_games(user_id, status);

-- =============================================================================
-- 3. IGDB_CACHE  (local cache of IGDB game data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS igdb_cache (
    id          SERIAL PRIMARY KEY,
    igdb_id     INT NOT NULL UNIQUE,
    slug        TEXT,
    name        TEXT,
    data        JSONB,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_igdb_cache_slug ON igdb_cache(slug);

-- =============================================================================
-- 4. GAME_LIKES  (users liking games)
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_likes (
    id            SERIAL PRIMARY KEY,
    igdb_game_id  INT NOT NULL,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (igdb_game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_likes_igdb_game_id ON game_likes(igdb_game_id);
CREATE INDEX IF NOT EXISTS idx_game_likes_user_id      ON game_likes(user_id);

-- =============================================================================
-- 5. COLLECTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS collections (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    is_public   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- =============================================================================
-- 6. COLLECTION_GAMES  (games inside a collection)
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_games (
    id              SERIAL PRIMARY KEY,
    collection_id   INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    igdb_game_id    INT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (collection_id, igdb_game_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_games_collection_id ON collection_games(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_games_igdb_game_id  ON collection_games(igdb_game_id);

-- =============================================================================
-- 7. COLLECTION_LIKES
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_likes (
    id             SERIAL PRIMARY KEY,
    collection_id  INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_likes_collection_id ON collection_likes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_likes_user_id       ON collection_likes(user_id);

-- =============================================================================
-- 8. COLLECTION_COMMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_comments (
    id             SERIAL PRIMARY KEY,
    collection_id  INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content        TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collection_comments_collection_id ON collection_comments(collection_id);

-- =============================================================================
-- 9. REVIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS reviews (
    id               SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    igdb_game_id     INT NOT NULL,
    rating           NUMERIC(2,1),                                -- 0.5 – 5.0
    status           VARCHAR(20),                                  -- 'playing' | 'completed' | 'dropped' etc.
    sub_status       VARCHAR(50),
    platform         VARCHAR(100),
    contains_spoiler BOOLEAN NOT NULL DEFAULT false,
    content          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, igdb_game_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_igdb_game_id ON reviews(igdb_game_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id      ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at   ON reviews(created_at DESC);

-- =============================================================================
-- 10. REVIEW_LIKES
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_likes (
    id          SERIAL PRIMARY KEY,
    review_id   INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);

-- =============================================================================
-- 11. REVIEW_COMMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_comments (
    id          SERIAL PRIMARY KEY,
    review_id   INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON review_comments(review_id);

-- =============================================================================
-- 12. FOLLOWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS follows (
    id            SERIAL PRIMARY KEY,
    follower_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- =============================================================================
-- 13. NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id            SERIAL PRIMARY KEY,
    recipient_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    metadata      JSONB DEFAULT '{}',
    is_read       BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON notifications(recipient_id, is_read, created_at DESC);

-- =============================================================================
-- 14. ACTIVITY_LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type  TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    metadata     JSONB DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id, created_at DESC);

-- =============================================================================
-- 15. REVIEW_REPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_reports (
    id          SERIAL PRIMARY KEY,
    review_id   INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT NOT NULL,
    details     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',   -- 'pending' | 'resolved' | 'dismissed'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);

-- =============================================================================
-- 16. REVIEW_COMMENT_REPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_comment_reports (
    id          SERIAL PRIMARY KEY,
    comment_id  INT NOT NULL REFERENCES review_comments(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT NOT NULL,
    details     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_comment_reports_status ON review_comment_reports(status);

-- =============================================================================
-- 17. PROFILE_REPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS profile_reports (
    id               SERIAL PRIMARY KEY,
    reported_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reporter_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason           TEXT NOT NULL,
    details          TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profile_reports_status ON profile_reports(status);

-- =============================================================================
-- 18. COLLECTION_REPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_reports (
    id             SERIAL PRIMARY KEY,
    collection_id  INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason         TEXT NOT NULL,
    details        TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_reports_status ON collection_reports(status);

-- =============================================================================
-- 19. COLLECTION_COMMENT_REPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_comment_reports (
    id          SERIAL PRIMARY KEY,
    comment_id  INT NOT NULL REFERENCES collection_comments(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT NOT NULL,
    details     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_comment_reports_status ON collection_comment_reports(status);

-- =============================================================================
-- 20. STEAM INTEGRATION (igual que migrations/001_steam_integration.sql)
-- =============================================================================

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
