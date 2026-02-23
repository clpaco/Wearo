-- Migración: tabla de planificación de outfits por día
-- Ejecutar: psql -U postgres -d outfitvault -f calendar.sql

CREATE TABLE IF NOT EXISTS calendar_entries (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  outfit_id     INTEGER REFERENCES outfits(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  notes         TEXT,
  weather_temp  REAL,
  weather_desc  VARCHAR(100),
  weather_icon  VARCHAR(20),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_user_date ON calendar_entries(user_id, date);
