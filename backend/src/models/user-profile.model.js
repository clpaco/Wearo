// Modelo de Perfil de Usuario — consultas de perfil público y stats
const { query } = require('../config/db');

// Obtener perfil público de un usuario con conteos
const getUserProfile = async (userId, currentUserId) => {
    const result = await query(
        `SELECT
           u.id,
           u.full_name,
           u.avatar_url,
           u.bio,
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

// Actualizar perfil (nombre y bio)
const updateProfile = async (userId, { fullName, bio, avatarUrl }) => {
    const result = await query(
        `UPDATE users
         SET full_name  = COALESCE($2, full_name),
             bio        = COALESCE($3, bio),
             avatar_url = COALESCE($4, avatar_url),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, full_name, avatar_url, bio, updated_at`,
        [userId, fullName, bio, avatarUrl]
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
