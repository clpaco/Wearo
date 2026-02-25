// Modelo de Perfil de Usuario — consultas de perfil público y stats
const { query } = require('../config/db');

// Auto-migration: agregar columnas nuevas si no existen
query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true')
    .catch((e) => console.warn('is_public migration:', e.message));
query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30)')
    .catch((e) => console.warn('username migration:', e.message));
query('ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)')
    .catch((e) => console.warn('gender migration:', e.message));
query('ALTER TABLE users ADD COLUMN IF NOT EXISTS style_preferences TEXT[]')
    .catch((e) => console.warn('style_preferences migration:', e.message));
query('ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false')
    .catch((e) => console.warn('onboarding_done migration:', e.message));
query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL')
    .catch((e) => console.warn('username index migration:', e.message));

// Obtener perfil público de un usuario con conteos
const getUserProfile = async (userId, currentUserId) => {
    const result = await query(
        `SELECT
           u.id,
           u.full_name,
           u.username,
           u.avatar_url,
           u.bio,
           u.gender,
           u.is_public,
           u.onboarding_done,
           u.created_at,
           (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS follower_count,
           (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id)  AS following_count,
           (SELECT COUNT(*)::int FROM garments WHERE user_id = u.id)     AS garment_count,
           (SELECT COUNT(*)::int FROM outfits WHERE user_id = u.id)      AS outfit_count,
           (SELECT COUNT(*)::int FROM shared_outfits WHERE user_id = u.id) AS post_count,
           EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS is_following_me
         FROM users u
         WHERE u.id = $1`,
        [userId, currentUserId]
    );
    return result.rows[0] || null;
};

// Actualizar perfil
const updateProfile = async (userId, { fullName, bio, avatarUrl, isPublic, username, gender, stylePreferences, onboardingDone }) => {
    const result = await query(
        `UPDATE users
         SET full_name  = COALESCE($2, full_name),
             bio        = COALESCE($3, bio),
             avatar_url = COALESCE($4, avatar_url),
             is_public  = COALESCE($5, is_public),
             username   = COALESCE($6, username),
             gender     = COALESCE($7, gender),
             style_preferences = COALESCE($8, style_preferences),
             onboarding_done   = COALESCE($9, onboarding_done),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, full_name, avatar_url, bio, is_public, username, gender, style_preferences, onboarding_done, updated_at`,
        [userId, fullName, bio, avatarUrl, isPublic, username, gender, stylePreferences, onboardingDone]
    );
    return result.rows[0];
};

// Obtener posts compartidos de un usuario (para su perfil)
const getUserPosts = async (userId, currentUserId, { limit = 20, offset = 0 } = {}) => {
    const result = await query(
        `SELECT
           so.id,
           so.caption,
           so.created_at,
           json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion, 'season', o.season) AS outfit,
           COALESCE(
             json_agg(
               json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url)
               ORDER BY og.position
             ) FILTER (WHERE g.id IS NOT NULL), '[]'
           ) AS garments,
           (SELECT COUNT(*)::int FROM likes WHERE shared_outfit_id = so.id) AS like_count,
           (SELECT COUNT(*)::int FROM comments WHERE shared_outfit_id = so.id) AS comment_count,
           EXISTS(SELECT 1 FROM likes WHERE shared_outfit_id = so.id AND user_id = $2) AS liked_by_me
         FROM shared_outfits so
         JOIN outfits o ON so.outfit_id = o.id
         LEFT JOIN outfit_garments og ON o.id = og.outfit_id
         LEFT JOIN garments g ON og.garment_id = g.id
         WHERE so.user_id = $1
         GROUP BY so.id, o.id
         ORDER BY so.created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, currentUserId, limit, offset]
    );
    return result.rows;
};

module.exports = { getUserProfile, updateProfile, getUserPosts };
