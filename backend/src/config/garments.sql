-- Migración: tabla de prendas (garments)
-- Ejecutar: psql -U postgres -d outfitvault -f garments.sql

CREATE TABLE IF NOT EXISTS garments (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(50) NOT NULL,
  color         VARCHAR(50),
  brand         VARCHAR(100),
  season        VARCHAR(50),
  image_url     TEXT,
  notes         TEXT,
  times_worn    INTEGER DEFAULT 0,
  is_favorite   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_garments_user ON garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_category ON garments(user_id, category);
CREATE INDEX IF NOT EXISTS idx_garments_color ON garments(user_id, color);
