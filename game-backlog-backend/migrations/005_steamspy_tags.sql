BEGIN;

CREATE TABLE IF NOT EXISTS steamspy_tags (
    steam_appid  INT PRIMARY KEY,
    tags         JSONB NOT NULL DEFAULT '{}'::jsonb,
    top_tags     TEXT[] NOT NULL DEFAULT '{}',
    subgenres    TEXT[] NOT NULL DEFAULT '{}',
    mechanics    TEXT[] NOT NULL DEFAULT '{}',
    settings     TEXT[] NOT NULL DEFAULT '{}',
    genres       TEXT[] NOT NULL DEFAULT '{}',
    positive     INT,
    negative     INT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_steamspy_tags_subgenres ON steamspy_tags USING GIN (subgenres);
CREATE INDEX IF NOT EXISTS idx_steamspy_tags_settings  ON steamspy_tags USING GIN (settings);
CREATE INDEX IF NOT EXISTS idx_steamspy_tags_mechanics ON steamspy_tags USING GIN (mechanics);

COMMIT;