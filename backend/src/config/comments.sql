-- Migración: tabla de comentarios en posts del feed social
-- Ejecutar una vez

CREATE TABLE IF NOT EXISTS comments (
  id               SERIAL PRIMARY KEY,
  shared_outfit_id INTEGER REFERENCES shared_outfits(id) ON DELETE CASCADE,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  text             TEXT NOT NULL CHECK (char_length(text) <= 500),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(shared_outfit_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
