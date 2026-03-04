-- Setup completo de Wearo para Railway
-- Ejecutar una sola vez al crear la base de datos

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  role          VARCHAR(20) DEFAULT 'user',
  disabled      BOOLEAN DEFAULT false,
  disabled_by   INTEGER,
  is_public     BOOLEAN DEFAULT true,
  username      VARCHAR(30),
  gender        VARCHAR(20),
  style_preferences TEXT[],
  onboarding_done BOOLEAN DEFAULT false,
  admin_tag     VARCHAR(50),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

-- 2. Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- 3. Prendas
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

CREATE INDEX IF NOT EXISTS idx_garments_user ON garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_category ON garments(user_id, category);

-- 4. Outfits
CREATE TABLE IF NOT EXISTS outfits (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  occasion      VARCHAR(50),
  season        VARCHAR(50),
  notes         TEXT,
  is_favorite   BOOLEAN DEFAULT FALSE,
  times_worn    INTEGER DEFAULT 0,
  cover_image   VARCHAR(255),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id);

CREATE TABLE IF NOT EXISTS outfit_garments (
  id          SERIAL PRIMARY KEY,
  outfit_id   INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
  garment_id  INTEGER REFERENCES garments(id) ON DELETE CASCADE,
  position    INTEGER DEFAULT 0,
  UNIQUE(outfit_id, garment_id)
);

-- 5. Calendario
CREATE TABLE IF NOT EXISTS calendar_entries (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  outfit_id     INTEGER REFERENCES outfits(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  notes         TEXT,
  weather_temp  REAL,
  weather_desc  VARCHAR(100),
  weather_icon  VARCHAR(20),
  worn          BOOLEAN DEFAULT false,
  garment_ids   INTEGER[] DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_user_date ON calendar_entries(user_id, date);

-- 6. Social: posts compartidos
CREATE TABLE IF NOT EXISTS shared_outfits (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  outfit_id     INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
  caption       TEXT,
  photos        TEXT[] DEFAULT '{}',
  garment_ids   INTEGER[] DEFAULT '{}',
  deleted       BOOLEAN DEFAULT false,
  deleted_by    INTEGER,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shared_outfits ALTER COLUMN outfit_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_outfits_user ON shared_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_outfits_created ON shared_outfits(created_at DESC);

-- 7. Likes
CREATE TABLE IF NOT EXISTS likes (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
  shared_outfit_id  INTEGER REFERENCES shared_outfits(id) ON DELETE CASCADE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shared_outfit_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_shared ON likes(shared_outfit_id);

-- 8. Comentarios
CREATE TABLE IF NOT EXISTS comments (
  id               SERIAL PRIMARY KEY,
  shared_outfit_id INTEGER REFERENCES shared_outfits(id) ON DELETE CASCADE,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  parent_id        INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  text             TEXT NOT NULL CHECK (char_length(text) <= 500),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(shared_outfit_id);

-- 9. Seguidores
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 10. Solicitudes de seguimiento
CREATE TABLE IF NOT EXISTS follow_requests (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(requester_id, target_id)
);

-- 11. Conversaciones y mensajes
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  participant_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_text TEXT DEFAULT '',
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  media_type VARCHAR(20),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- 12. Tickets de soporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_admin_id INTEGER REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
