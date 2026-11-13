-- =============================================================================
-- 002 — Steam integration (fase 2: registro / login con Steam)
-- Permite cuentas creadas únicamente con Steam (sin password ni email).
--
-- Uso:  psql -U postgres -d game_backlog -f migrations/002_steam_auth.sql
-- =============================================================================

BEGIN;

ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

COMMIT;