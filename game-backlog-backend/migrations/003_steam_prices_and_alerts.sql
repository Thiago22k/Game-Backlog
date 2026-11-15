BEGIN;

CREATE TABLE IF NOT EXISTS steam_price_cache (
    steam_appid       INT NOT NULL,
    country_code      VARCHAR(5) NOT NULL DEFAULT 'US',
    currency          VARCHAR(10),
    initial_price     INT,                -- en centavos (ej: 5999 = $59.99)
    final_price       INT,                -- en centavos tras descuento
    discount_percent  INT NOT NULL DEFAULT 0,
    initial_formatted TEXT,
    final_formatted   TEXT,
    is_free           BOOLEAN NOT NULL DEFAULT false,
    coming_soon       BOOLEAN NOT NULL DEFAULT false,
    available         BOOLEAN NOT NULL DEFAULT true,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (steam_appid, country_code)
);

CREATE TABLE IF NOT EXISTS wishlist_price_alerts (
    user_id                 INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    steam_appid             INT NOT NULL,
    igdb_game_id            INT NOT NULL,
    last_notified_discount  INT NOT NULL DEFAULT 0,
    last_notified_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, steam_appid)
);

COMMIT;