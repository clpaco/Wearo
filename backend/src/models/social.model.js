// Modelo Social — feed público de outfits compartidos, likes y comentarios
const { query } = require('../config/db');

// Compartir un outfit al feed público
const shareOutfit = async (userId, outfitId, caption) => {
    const result = await query(
        `INSERT INTO shared_outfits (user_id, outfit_id, caption)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [userId, outfitId, caption]
    );
    return result.rows[0];
};

// Eliminar un outfit del feed (solo el autor)
const unshareOutfit = async (userId, sharedId) => {
    const result = await query(
        'DELETE FROM shared_outfits WHERE id = $1 AND user_id = $2 RETURNING id',
        [sharedId, userId]
    );
    return result.rows[0] || null;
};

// Obtener feed público con paginación (más recientes primero)
const getFeed = async (currentUserId, { limit = 20, offset = 0 } = {}) => {
    const result = await query(
        `SELECT
      so.id,
      so.caption,
      so.created_at,
      json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) AS author,
      json_build_object(
        'id', o.id, 'name', o.name, 'occasion', o.occasion, 'season', o.season
      ) AS outfit,
      COALESCE(
        json_agg(
          json_build_object('id', g.id, 'name', g.name, 'category', g.category, 'color', g.color, 'image_url', g.image_url)
          ORDER BY og.position
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS garments,
      (SELECT COUNT(*) FROM likes WHERE shared_outfit_id = so.id)::int AS like_count,
      (SELECT COUNT(*) FROM comments WHERE shared_outfit_id = so.id)::int AS comment_count,
      EXISTS(SELECT 1 FROM likes WHERE shared_outfit_id = so.id AND user_id = $1) AS liked_by_me
    FROM shared_outfits so
    JOIN users u ON so.user_id = u.id
    JOIN outfits o ON so.outfit_id = o.id
    LEFT JOIN outfit_garments og ON o.id = og.outfit_id
    LEFT JOIN garments g ON og.garment_id = g.id
    GROUP BY so.id, u.id, o.id
    ORDER BY so.created_at DESC
    LIMIT $2 OFFSET $3`,
        [currentUserId, limit, offset]
    );
    return result.rows;
};

// Obtener mis outfits compartidos
const getMyShared = async (userId) => {
    const result = await query(
        `SELECT so.id, so.caption, so.created_at,
      json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion) AS outfit,
      (SELECT COUNT(*) FROM likes WHERE shared_outfit_id = so.id)::int AS like_count
    FROM shared_outfits so
    JOIN outfits o ON so.outfit_id = o.id
    WHERE so.user_id = $1
    ORDER BY so.created_at DESC`,
        [userId]
    );
    return result.rows;
};

// Dar like a un outfit compartido
const addLike = async (userId, sharedOutfitId) => {
    const result = await query(
        `INSERT INTO likes (user_id, shared_outfit_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, shared_outfit_id) DO NOTHING
     RETURNING *`,
        [userId, sharedOutfitId]
    );
    return result.rows[0] || null;
};

// Quitar like
const removeLike = async (userId, sharedOutfitId) => {
    const result = await query(
        'DELETE FROM likes WHERE user_id = $1 AND shared_outfit_id = $2 RETURNING id',
        [userId, sharedOutfitId]
    );
    return result.rows[0] || null;
};

// Contar likes de un post
const getLikeCount = async (sharedOutfitId) => {
    const result = await query(
        'SELECT COUNT(*)::int AS count FROM likes WHERE shared_outfit_id = $1',
        [sharedOutfitId]
    );
    return result.rows[0].count;
};

// Verificar si un outfit ya está compartido por el usuario
const isShared = async (userId, outfitId) => {
    const result = await query(
        'SELECT id FROM shared_outfits WHERE user_id = $1 AND outfit_id = $2',
        [userId, outfitId]
    );
    return result.rows[0] || null;
};

// ── Comentarios ──────────────────────────────────────────────────────────────

// Obtener comentarios de un post con datos del autor
const getComments = async (sharedOutfitId, { limit = 50, offset = 0 } = {}) => {
    const result = await query(
        `SELECT
       c.id,
       c.text,
       c.created_at,
       json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) AS author
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.shared_outfit_id = $1
     ORDER BY c.created_at ASC
     LIMIT $2 OFFSET $3`,
        [sharedOutfitId, limit, offset]
    );
    return result.rows;
};

// Añadir comentario
const addComment = async (userId, sharedOutfitId, text) => {
    const result = await query(
        `INSERT INTO comments (user_id, shared_outfit_id, text)
     VALUES ($1, $2, $3)
     RETURNING id, text, created_at`,
        [userId, sharedOutfitId, text]
    );
    const comment = result.rows[0];
    // Obtener datos del autor para devolverlos junto con el comentario
    const userResult = await query(
        'SELECT id, full_name, avatar_url FROM users WHERE id = $1',
        [userId]
    );
    const u = userResult.rows[0];
    return {
        ...comment,
        author: { id: u.id, fullName: u.full_name, avatarUrl: u.avatar_url },
    };
};

// Eliminar comentario (solo el autor puede borrar el suyo)
const deleteComment = async (userId, commentId) => {
    const result = await query(
        'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
        [commentId, userId]
    );
    return result.rows[0] || null;
};

module.exports = {
    shareOutfit, unshareOutfit, getFeed, getMyShared,
    addLike, removeLike, getLikeCount, isShared,
    getComments, addComment, deleteComment,
};
