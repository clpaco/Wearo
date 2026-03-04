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
// Si el usuario es admin, muestra stats combinados de todos los admins (identidad Wearo compartida)
const getUserProfile = async (userId, currentUserId) => {
    // Primero verificar si es admin
    const roleCheck = await query('SELECT role FROM users WHERE id = $1', [userId]);
    const isAdmin = roleCheck.rows[0]?.role === 'admin';

    if (isAdmin) {
        // Perfil Wearo compartido: nombre "Wearo", stats combinados de todos los admins
        const result = await query(
            `SELECT
               u.id,
               'Wearo' AS full_name,
               NULL AS username,
               NULL AS avatar_url,
               u.bio,
               u.gender,
               u.is_public,
               u.disabled,
               u.onboarding_done,
               u.created_at,
               u.role,
               u.admin_tag,
               (SELECT (
                   (SELECT COUNT(DISTINCT f2.follower_id)::int FROM follows f2 JOIN users u2 ON f2.follower_id = u2.id WHERE f2.following_id IN (SELECT id FROM users WHERE role = 'admin') AND u2.role != 'admin')
                   + CASE WHEN EXISTS(SELECT 1 FROM follows f2 JOIN users u2 ON f2.follower_id = u2.id WHERE f2.following_id IN (SELECT id FROM users WHERE role = 'admin') AND u2.role = 'admin') THEN 1 ELSE 0 END
               )) AS follower_count,
               (SELECT COUNT(DISTINCT f2.following_id)::int FROM follows f2 JOIN users u2 ON f2.follower_id = u2.id WHERE u2.role = 'admin' AND f2.following_id NOT IN (SELECT id FROM users WHERE role = 'admin')) AS following_count,
               0 AS garment_count,
               0 AS outfit_count,
               (SELECT COUNT(*)::int FROM shared_outfits so2 JOIN users u2 ON so2.user_id = u2.id WHERE u2.role = 'admin' AND (so2.deleted IS NOT TRUE)) AS post_count,
               EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id IN (SELECT id FROM users WHERE role = 'admin')) AS is_following,
               EXISTS(SELECT 1 FROM follows WHERE following_id = $2 AND follower_id IN (SELECT id FROM users WHERE role = 'admin')) AS is_following_me,
               u.full_name AS admin_real_name
             FROM users u
             WHERE u.id = $1`,
            [userId, currentUserId]
        );
        return result.rows[0] || null;
    }

    const result = await query(
        `SELECT
           u.id,
           u.full_name,
           u.username,
           u.avatar_url,
           u.bio,
           u.gender,
           u.is_public,
           u.disabled,
           u.onboarding_done,
           u.created_at,
           u.role,
           u.admin_tag,
           (SELECT (
               (SELECT COUNT(*)::int FROM follows f2 JOIN users u2 ON f2.follower_id = u2.id WHERE f2.following_id = u.id AND u2.role != 'admin')
               + CASE WHEN EXISTS(SELECT 1 FROM follows f2 JOIN users u2 ON f2.follower_id = u2.id WHERE f2.following_id = u.id AND u2.role = 'admin') THEN 1 ELSE 0 END
           )) AS follower_count,
           (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id AND following_id NOT IN (SELECT id FROM users WHERE role = 'admin')) AS following_count,
           (SELECT COUNT(*)::int FROM garments WHERE user_id = u.id)     AS garment_count,
           (SELECT COUNT(*)::int FROM outfits WHERE user_id = u.id)      AS outfit_count,
           (SELECT COUNT(*)::int FROM shared_outfits WHERE user_id = u.id AND (deleted IS NOT TRUE)) AS post_count,
           EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS is_following,
           EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS is_following_me
         FROM users u
         WHERE u.id = $1`,
        [userId, currentUserId]
    );
    return result.rows[0] || null;
};

// Actualizar perfil
const updateProfile = async (userId, { fullName, bio, avatarUrl, isPublic, username, gender, stylePreferences, onboardingDone, adminTag }) => {
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
             admin_tag  = COALESCE($10, admin_tag),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, full_name, avatar_url, bio, is_public, username, gender, style_preferences, onboarding_done, admin_tag, updated_at`,
        [userId, fullName, bio, avatarUrl, isPublic, username, gender, stylePreferences, onboardingDone, adminTag]
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
           COALESCE(so.photos, '{}') AS photos,
           CASE WHEN so.outfit_id IS NOT NULL
             THEN json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion, 'season', o.season, 'cover_image', o.cover_image)
             ELSE NULL
           END AS outfit,
           COALESCE(
             CASE
               WHEN so.outfit_id IS NOT NULL THEN (
                 SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url) ORDER BY og.position)
                 FROM outfit_garments og JOIN garments g ON og.garment_id = g.id WHERE og.outfit_id = so.outfit_id
               )
               ELSE (
                 SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url))
                 FROM garments g WHERE g.id = ANY(so.garment_ids)
               )
             END, '[]'
           ) AS garments,
           (SELECT COUNT(*)::int FROM likes WHERE shared_outfit_id = so.id) AS like_count,
           (SELECT COUNT(*)::int FROM comments WHERE shared_outfit_id = so.id) AS comment_count,
           EXISTS(SELECT 1 FROM likes WHERE shared_outfit_id = so.id AND user_id = $2) AS liked_by_me
         FROM shared_outfits so
         LEFT JOIN outfits o ON so.outfit_id = o.id
         WHERE so.user_id = $1 AND (so.deleted IS NOT TRUE)
         ORDER BY so.created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, currentUserId, limit, offset]
    );
    return result.rows;
};

// Obtener posts de TODOS los admins (para el perfil compartido Wearo)
const getAllAdminPosts = async (currentUserId, { limit = 20, offset = 0 } = {}) => {
    const result = await query(
        `SELECT
           so.id,
           so.caption,
           so.created_at,
           COALESCE(so.photos, '{}') AS photos,
           CASE WHEN so.outfit_id IS NOT NULL
             THEN json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion, 'season', o.season, 'cover_image', o.cover_image)
             ELSE NULL
           END AS outfit,
           COALESCE(
             CASE
               WHEN so.outfit_id IS NOT NULL THEN (
                 SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url) ORDER BY og.position)
                 FROM outfit_garments og JOIN garments g ON og.garment_id = g.id WHERE og.outfit_id = so.outfit_id
               )
               ELSE (
                 SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url))
                 FROM garments g WHERE g.id = ANY(so.garment_ids)
               )
             END, '[]'
           ) AS garments,
           (SELECT COUNT(*)::int FROM likes WHERE shared_outfit_id = so.id) AS like_count,
           (SELECT COUNT(*)::int FROM comments WHERE shared_outfit_id = so.id) AS comment_count,
           EXISTS(SELECT 1 FROM likes WHERE shared_outfit_id = so.id AND user_id = $1) AS liked_by_me
         FROM shared_outfits so
         LEFT JOIN outfits o ON so.outfit_id = o.id
         JOIN users u ON so.user_id = u.id
         WHERE u.role = 'admin' AND (so.deleted IS NOT TRUE)
         ORDER BY so.created_at DESC
         LIMIT $2 OFFSET $3`,
        [currentUserId, limit, offset]
    );
    return result.rows;
};

module.exports = { getUserProfile, updateProfile, getUserPosts, getAllAdminPosts };
