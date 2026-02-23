-- Migración: tablas de outfits
-- Ejecutar: psql -U postgres -d outfitvault -f outfits.sql

-- Tabla principal de outfits
CREATE TABLE IF NOT EXISTS outfits (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  occasion      VARCHAR(50),
  season        VARCHAR(50),
  notes         TEXT,
  is_favorite   BOOLEAN DEFAULT FALSE,
  times_worn    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id);

-- Tabla pivote: relación many-to-many outfit <-> garments
CREATE TABLE IF NOT EXISTS outfit_garments (
  id          SERIAL PRIMARY KEY,
  outfit_id   INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
  garment_id  INTEGER REFERENCES garments(id) ON DELETE CASCADE,
  position    INTEGER DEFAULT 0,
  UNIQUE(outfit_id, garment_id)
);

CREATE INDEX IF NOT EXISTS idx_outfit_garments_outfit ON outfit_garments(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_garments_garment ON outfit_garments(garment_id);
