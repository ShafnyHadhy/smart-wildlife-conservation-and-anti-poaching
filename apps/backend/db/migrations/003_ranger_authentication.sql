-- Ranger passwords are stored as PostgreSQL pgcrypto bcrypt hashes.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
