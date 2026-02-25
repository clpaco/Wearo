// Modelo Social — feed público de outfits compartidos, likes y comentarios
const { query } = require('../config/db');

// Auto-migrations
query('ALTER TABLE shared_outfits ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT \'{}\'')
    .catch(() => {});

// Crear tabla comments si no existe
query(`
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shared_outfit_id INTEGER NOT NULL REFERENCES shared_outfits(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )
`).catch(() => {});
query('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(shared_outfit_id)').catch(() => {});

// Compartir un outfit al feed público (con fotos opcionales)
const shareOutfit = async (userId, outfitId, caption, photos = []) => {
    const result = await query(
        `INSERT INTO shared_outfits (user_id, outfit_id, caption, photos)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [userId, outfitId, caption, photos]
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
        ? `WHERE so.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)`
        : `WHERE (u.is_public = true OR so.user_id = $1)`;

    const result = await query(
        `SELECT
      so.id,
      so.caption,
      so.created_at,
      so.user_id,
      COALESCE(so.photos, '{}') AS photos,
      json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url, 'username', u.username) AS author,
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
    ${whereClause}
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

// ── Búsqueda ─────────────────────────────────────────────────────────────────

// Buscar posts por texto (caption, outfit name, garment names, author name)
const searchPosts = async (currentUserId, searchTerm, limit = 20) => {
    const pattern = `%${searchTerm}%`;
    const result = await query(
        `SELECT
      so.id, so.caption, so.created_at, so.user_id,
      COALESCE(so.photos, '{}') AS photos,
      json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url, 'username', u.username) AS author,
      json_build_object('id', o.id, 'name', o.name, 'occasion', o.occasion, 'season', o.season) AS outfit,
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
    WHERE (u.is_public = true OR so.user_id = $1)
      AND (so.caption ILIKE $2 OR o.name ILIKE $2 OR u.full_name ILIKE $2 OR o.occasion ILIKE $2 OR g.name ILIKE $2 OR g.category ILIKE $2)
    GROUP BY so.id, u.id, o.id
    ORDER BY like_count DESC NULLS LAST, so.created_at DESC
    LIMIT $3`,
        [currentUserId, pattern, limit]
    );
    return result.rows;
};

// Buscar usuarios por nombre
const searchUsers = async (searchTerm, limit = 10) => {
    const pattern = `%${searchTerm}%`;
    const result = await query(
        `SELECT id, full_name, avatar_url, is_public
     FROM users
     WHERE full_name ILIKE $1
     ORDER BY full_name ASC
     LIMIT $2`,
        [pattern, limit]
    );
    return result.rows.map((u) => ({
        id: u.id,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        isPublic: u.is_public,
    }));
};

module.exports = {
    shareOutfit, unshareOutfit, getFeed, getMyShared,
    addLike, removeLike, getLikeCount, getLikers, isShared,
    getComments, addComment, deleteComment,
    searchPosts, searchUsers,
};
