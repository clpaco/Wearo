// Modelo Social — feed público de outfits compartidos, likes y comentarios
const { query } = require('../config/db');

// Auto-migrations
query('ALTER TABLE shared_outfits ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT \'{}\'')
    .catch(() => {});
query('ALTER TABLE shared_outfits ALTER COLUMN outfit_id DROP NOT NULL')
    .catch(() => {});
query('ALTER TABLE shared_outfits ADD COLUMN IF NOT EXISTS garment_ids INTEGER[] DEFAULT \'{}\'')
    .catch(() => {});

// Crear tabla comments si no existe
query(`
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shared_outfit_id INTEGER NOT NULL REFERENCES shared_outfits(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )
`).catch(() => {});
query('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(shared_outfit_id)').catch(() => {});
query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE').catch(() => {});
query('CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)').catch(() => {});

// Compartir al feed público (outfit o prendas sueltas, con fotos opcionales)
const shareOutfit = async (userId, outfitId, caption, photos = [], garmentIds = []) => {
    const result = await query(
        `INSERT INTO shared_outfits (user_id, outfit_id, caption, photos, garment_ids)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [userId, outfitId || null, caption, photos, garmentIds]
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
// mode: 'discover' = posts de usuarios públicos, 'following' = posts de seguidos
const getFeed = async (currentUserId, { limit = 20, offset = 0, mode = 'discover' } = {}) => {
    const whereClause = mode === 'following'
        ? `WHERE (so.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1) OR u.role = 'admin') AND u.disabled = false AND (so.deleted IS NOT TRUE)`
        : `WHERE (u.is_public = true OR so.user_id = $1 OR u.role = 'admin') AND u.disabled = false AND (so.deleted IS NOT TRUE)`;

    const result = await query(
        `SELECT
      so.id,
      so.caption,
      so.created_at,
      so.user_id,
      COALESCE(so.photos, '{}') AS photos,
      json_build_object('id', u.id,
        'fullName', CASE WHEN u.role = 'admin' THEN 'Wearo' ELSE u.full_name END,
        'avatarUrl', CASE WHEN u.role = 'admin' THEN NULL ELSE u.avatar_url END,
        'username', CASE WHEN u.role = 'admin' THEN 'wearo' ELSE u.username END,
        'isAdmin', u.role = 'admin'
      ) AS author,
      CASE WHEN so.outfit_id IS NOT NULL
        THEN json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion, 'season', o.season, 'cover_image', o.cover_image)
        ELSE NULL
      END AS outfit,
      COALESCE(
        CASE
          WHEN so.outfit_id IS NOT NULL THEN (
            SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'category', g.category, 'color', g.color, 'image_url', g.image_url) ORDER BY og.position)
            FROM outfit_garments og JOIN garments g ON og.garment_id = g.id WHERE og.outfit_id = so.outfit_id
          )
          ELSE (
            SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'category', g.category, 'color', g.color, 'image_url', g.image_url))
            FROM garments g WHERE g.id = ANY(so.garment_ids)
          )
        END, '[]'
      ) AS garments,
      (SELECT COUNT(*) FROM likes WHERE shared_outfit_id = so.id)::int AS like_count,
      (SELECT COUNT(*) FROM comments WHERE shared_outfit_id = so.id)::int AS comment_count,
      EXISTS(SELECT 1 FROM likes WHERE shared_outfit_id = so.id AND user_id = $1) AS liked_by_me
    FROM shared_outfits so
    JOIN users u ON so.user_id = u.id
    LEFT JOIN outfits o ON so.outfit_id = o.id
    ${whereClause}
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
      CASE WHEN so.outfit_id IS NOT NULL
        THEN json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion)
        ELSE NULL
      END AS outfit,
      (SELECT COUNT(*) FROM likes WHERE shared_outfit_id = so.id)::int AS like_count
    FROM shared_outfits so
    LEFT JOIN outfits o ON so.outfit_id = o.id
    WHERE so.user_id = $1 AND (so.deleted IS NOT TRUE)
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

// Obtener lista de usuarios que dieron like
const getLikers = async (sharedOutfitId, { limit = 50, offset = 0 } = {}) => {
    const result = await query(
        `SELECT l.created_at AS liked_at,
            json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) AS user
         FROM likes l
         JOIN users u ON l.user_id = u.id
         WHERE l.shared_outfit_id = $1
         ORDER BY l.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sharedOutfitId, limit, offset]
    );
    return result.rows;
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

// Obtener comentarios de un post con datos del autor (incluye parent_id y reply_count)
const getComments = async (sharedOutfitId, { limit = 100, offset = 0 } = {}) => {
    const result = await query(
        `SELECT
       c.id,
       c.text,
       c.parent_id,
       c.created_at,
       json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) AS author,
       (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id)::int AS reply_count
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.shared_outfit_id = $1
     ORDER BY c.created_at ASC
     LIMIT $2 OFFSET $3`,
        [sharedOutfitId, limit, offset]
    );
    return result.rows;
};

// Añadir comentario (con parent_id opcional para respuestas)
const addComment = async (userId, sharedOutfitId, text, parentId = null) => {
    const result = await query(
        `INSERT INTO comments (user_id, shared_outfit_id, text, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, text, parent_id, created_at`,
        [userId, sharedOutfitId, text, parentId]
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

// Admin: soft-delete post con tracking
const deletePostAdmin = async (postId, adminId) => {
    const result = await query(
        'UPDATE shared_outfits SET deleted = true, deleted_by = $2 WHERE id = $1 RETURNING id',
        [postId, adminId]
    );
    return result.rows[0] || null;
};

// Admin: borrar comentario sin chequear dueño
const deleteCommentAdmin = async (commentId) => {
    const result = await query(
        'DELETE FROM comments WHERE id = $1 RETURNING id',
        [commentId]
    );
    return result.rows[0] || null;
};

// ── Búsqueda ─────────────────────────────────────────────────────────────────

// Buscar posts por texto (caption, outfit name, garment names/category/color, author name)
// Ordenados por relevancia: coincidencias directas primero
const searchPosts = async (currentUserId, searchTerm, limit = 20) => {
    const pattern = `%${searchTerm}%`;
    const result = await query(
        `SELECT
      so.id, so.caption, so.created_at, so.user_id,
      COALESCE(so.photos, '{}') AS photos,
      json_build_object('id', u.id,
        'fullName', CASE WHEN u.role = 'admin' THEN 'Wearo' ELSE u.full_name END,
        'avatarUrl', CASE WHEN u.role = 'admin' THEN NULL ELSE u.avatar_url END,
        'username', CASE WHEN u.role = 'admin' THEN 'wearo' ELSE u.username END,
        'isAdmin', u.role = 'admin'
      ) AS author,
      CASE WHEN so.outfit_id IS NOT NULL
        THEN json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion, 'season', o.season, 'cover_image', o.cover_image)
        ELSE NULL
      END AS outfit,
      COALESCE(
        CASE
          WHEN so.outfit_id IS NOT NULL THEN (
            SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'category', g.category, 'color', g.color, 'image_url', g.image_url) ORDER BY og.position)
            FROM outfit_garments og JOIN garments g ON og.garment_id = g.id WHERE og.outfit_id = so.outfit_id
          )
          ELSE (
            SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'category', g.category, 'color', g.color, 'image_url', g.image_url))
            FROM garments g WHERE g.id = ANY(so.garment_ids)
          )
        END, '[]'
      ) AS garments,
      (SELECT COUNT(*) FROM likes WHERE shared_outfit_id = so.id)::int AS like_count,
      (SELECT COUNT(*) FROM comments WHERE shared_outfit_id = so.id)::int AS comment_count,
      EXISTS(SELECT 1 FROM likes WHERE shared_outfit_id = so.id AND user_id = $1) AS liked_by_me,
      (
        CASE WHEN o.name ILIKE $2 THEN 4 ELSE 0 END +
        CASE WHEN EXISTS(SELECT 1 FROM garments g3
          WHERE (g3.id = ANY(so.garment_ids) OR g3.id IN (SELECT og3.garment_id FROM outfit_garments og3 WHERE og3.outfit_id = so.outfit_id))
            AND g3.name ILIKE $2) THEN 3 ELSE 0 END +
        CASE WHEN EXISTS(SELECT 1 FROM garments g4
          WHERE (g4.id = ANY(so.garment_ids) OR g4.id IN (SELECT og4.garment_id FROM outfit_garments og4 WHERE og4.outfit_id = so.outfit_id))
            AND (g4.category ILIKE $2 OR g4.color ILIKE $2)) THEN 2 ELSE 0 END +
        CASE WHEN so.caption ILIKE $2 THEN 2 ELSE 0 END +
        CASE WHEN o.occasion ILIKE $2 OR o.season ILIKE $2 THEN 1 ELSE 0 END +
        CASE WHEN u.full_name ILIKE $2 THEN 1 ELSE 0 END
      ) AS relevance
    FROM shared_outfits so
    JOIN users u ON so.user_id = u.id
    LEFT JOIN outfits o ON so.outfit_id = o.id
    WHERE (u.is_public = true OR so.user_id = $1) AND u.disabled = false AND (so.deleted IS NOT TRUE)
      AND (so.caption ILIKE $2 OR o.name ILIKE $2 OR u.full_name ILIKE $2 OR o.occasion ILIKE $2 OR o.season ILIKE $2
        OR EXISTS(SELECT 1 FROM garments g2
          WHERE (g2.id = ANY(so.garment_ids) OR g2.id IN (SELECT og2.garment_id FROM outfit_garments og2 WHERE og2.outfit_id = so.outfit_id))
            AND (g2.name ILIKE $2 OR g2.category ILIKE $2 OR g2.color ILIKE $2))
      )
    ORDER BY relevance DESC, like_count DESC NULLS LAST, so.created_at DESC
    LIMIT $3`,
        [currentUserId, pattern, limit]
    );
    return result.rows;
};

// Buscar usuarios por nombre o username
const searchUsers = async (searchTerm, limit = 10) => {
    const pattern = `%${searchTerm}%`;
    const result = await query(
        `SELECT id, full_name, avatar_url, username, is_public
     FROM users
     WHERE (full_name ILIKE $1 OR username ILIKE $1) AND disabled = false AND role != 'admin'
     ORDER BY
       CASE WHEN full_name ILIKE $1 AND username ILIKE $1 THEN 0
            WHEN full_name ILIKE $1 THEN 1
            ELSE 2 END,
       full_name ASC
     LIMIT $2`,
        [pattern, limit]
    );
    return result.rows.map((u) => ({
        id: u.id,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        username: u.username,
        isPublic: u.is_public,
    }));
};

// Obtener preview de posts por IDs (para mensajes compartidos en DMs)
const getPostPreviews = async (postIds) => {
    if (!postIds || postIds.length === 0) return {};
    const result = await query(
        `SELECT so.id, so.caption,
         COALESCE(so.photos, '{}') AS photos,
         json_build_object('id', u.id,
           'fullName', CASE WHEN u.role = 'admin' THEN 'Wearo' ELSE u.full_name END,
           'avatarUrl', CASE WHEN u.role = 'admin' THEN NULL ELSE u.avatar_url END,
           'isAdmin', u.role = 'admin'
         ) AS author,
         CASE WHEN so.outfit_id IS NOT NULL
           THEN json_build_object('id', o.id, 'name', o.name)
           ELSE NULL
         END AS outfit,
         COALESCE(
           CASE
             WHEN so.outfit_id IS NOT NULL THEN (
               SELECT g.image_url FROM outfit_garments og JOIN garments g ON og.garment_id = g.id
               WHERE og.outfit_id = so.outfit_id AND g.image_url IS NOT NULL ORDER BY og.position LIMIT 1
             )
             ELSE (
               SELECT g.image_url FROM garments g
               WHERE g.id = ANY(so.garment_ids) AND g.image_url IS NOT NULL LIMIT 1
             )
           END
         ) AS first_garment_image
        FROM shared_outfits so
        JOIN users u ON so.user_id = u.id
        LEFT JOIN outfits o ON so.outfit_id = o.id
        WHERE so.id = ANY($1) AND (so.deleted IS NOT TRUE)`,
        [postIds]
    );
    const map = {};
    for (const row of result.rows) {
        map[row.id] = row;
    }
    return map;
};

module.exports = {
    shareOutfit, unshareOutfit, getFeed, getMyShared,
    addLike, removeLike, getLikeCount, getLikers, isShared,
    getComments, addComment, deleteComment,
    deletePostAdmin, deleteCommentAdmin,
    searchPosts, searchUsers, getPostPreviews,
};
