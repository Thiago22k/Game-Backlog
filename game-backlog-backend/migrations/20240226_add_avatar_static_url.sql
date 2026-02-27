-- Migration: Add avatar_static_url to users table
ALTER TABLE users ADD COLUMN avatar_static_url VARCHAR(255);
