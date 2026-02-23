-- Migración: módulo de perfil y seguidores
-- Ejecutar una vez para añadir bio a usuarios y crear tabla follows

-- Añadir bio al perfil de usuario (si no existe)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Tabla de seguidores
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
