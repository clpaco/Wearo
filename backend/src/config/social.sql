-- Migración: tablas del módulo social (feed público + likes)
-- Ejecutar: psql -U postgres -d outfitvault -f social.sql

-- Posts compartidos: un usuario comparte un outfit al feed público
CREATE TABLE IF NOT EXISTS shared_outfits (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  outfit_id     INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
  caption       TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, outfit_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_outfits_user ON shared_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_outfits_created ON shared_outfits(created_at DESC);

-- Likes en outfits compartidos
CREATE TABLE IF NOT EXISTS likes (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
  shared_outfit_id  INTEGER REFERENCES shared_outfits(id) ON DELETE CASCADE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shared_outfit_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_shared ON likes(shared_outfit_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
