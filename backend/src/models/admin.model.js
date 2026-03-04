// Modelo Admin — consultas de administracion
const { query } = require('../config/db');
const bcrypt = require('bcrypt');

// Auto-migraciones: soft-delete y tracking de acciones
(async () => {
    try {
        await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_by INTEGER');
        await query('ALTER TABLE shared_outfits ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false');
        await query('ALTER TABLE shared_outfits ADD COLUMN IF NOT EXISTS deleted_by INTEGER');
    } catch (e) { console.warn('admin migrations:', e.message); }
})();

// Obtener todos los usuarios con stats
const getAllUsers = async () => {
    const result = await query(`
        SELECT u.id, u.email, u.full_name, u.username, u.avatar_url, u.role,
               u.disabled, u.created_at,
               (SELECT COUNT(*) FROM garments WHERE user_id = u.id) AS garment_count,
               (SELECT COUNT(*) FROM outfits WHERE user_id = u.id) AS outfit_count,
               (SELECT COUNT(*) FROM shared_outfits WHERE user_id = u.id AND (deleted IS NOT TRUE)) AS post_count
        FROM users u
        ORDER BY u.created_at DESC
    `);
    return result.rows;
};

// Activar/desactivar usuario (trackea que admin lo hizo)
const toggleUserDisabled = async (userId, disabled, adminId) => {
    const result = await query(
        'UPDATE users SET disabled = $2, disabled_by = $3, updated_at = NOW() WHERE id = $1 RETURNING id, email, full_name, disabled',
        [userId, disabled, disabled ? adminId : null]
    );
    return result.rows[0];
};

// Crear usuario admin
const createAdminUser = async (email, password, fullName) => {
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
        `INSERT INTO users (email, password_hash, full_name, role, is_public)
         VALUES ($1, $2, $3, 'admin', true)
         RETURNING id, email, full_name, role`,
        [email, hash, fullName]
    );
    return result.rows[0];
};

// Obtener posts de Wearo (solo admin) con thumbnail
const getRecentPosts = async (limit = 50) => {
    const result = await query(`
        SELECT so.id, so.caption, so.created_at, so.user_id,
               COALESCE(so.photos, '{}') AS photos,
               'Wearo' AS author_name, u.email AS author_email,
               o.name AS outfit_name, o.cover_image,
               (SELECT g.image_url FROM outfit_garments og
                JOIN garments g ON og.garment_id = g.id
                WHERE og.outfit_id = so.outfit_id
                ORDER BY og.position LIMIT 1) AS first_garment_image
        FROM shared_outfits so
        JOIN users u ON u.id = so.user_id
        LEFT JOIN outfits o ON o.id = so.outfit_id
        WHERE u.role = 'admin' AND (so.deleted IS NOT TRUE)
        ORDER BY so.created_at DESC
        LIMIT $1
    `, [limit]);
    return result.rows;
};

// Obtener posts de usuarios normales (no admin) publicados
const getRecentUserPosts = async (limit = 50) => {
    const result = await query(`
        SELECT so.id, so.caption, so.created_at, so.user_id,
               COALESCE(so.photos, '{}') AS photos,
               u.full_name AS author_name, u.email AS author_email,
               o.name AS outfit_name, o.cover_image,
               (SELECT g.image_url FROM outfit_garments og
                JOIN garments g ON og.garment_id = g.id
                WHERE og.outfit_id = so.outfit_id
                ORDER BY og.position LIMIT 1) AS first_garment_image
        FROM shared_outfits so
        JOIN users u ON u.id = so.user_id
        LEFT JOIN outfits o ON o.id = so.outfit_id
        WHERE u.role != 'admin' AND (so.deleted IS NOT TRUE)
        ORDER BY so.created_at DESC
        LIMIT $1
    `, [limit]);
    return result.rows;
};

// Obtener todos los posts eliminados (Wearo + usuarios) para recuperar
const getDeletedPosts = async (limit = 50) => {
    const result = await query(`
        SELECT so.id, so.caption, so.created_at, so.user_id,
               COALESCE(so.photos, '{}') AS photos,
               CASE WHEN u.role = 'admin' THEN 'Wearo' ELSE u.full_name END AS author_name,
               u.email AS author_email,
               o.name AS outfit_name, o.cover_image,
               (SELECT g.image_url FROM outfit_garments og
                JOIN garments g ON og.garment_id = g.id
                WHERE og.outfit_id = so.outfit_id
                ORDER BY og.position LIMIT 1) AS first_garment_image,
               u.role AS author_role
        FROM shared_outfits so
        JOIN users u ON u.id = so.user_id
        LEFT JOIN outfits o ON o.id = so.outfit_id
        WHERE so.deleted = true
        ORDER BY so.created_at DESC
        LIMIT $1
    `, [limit]);
    return result.rows;
};

// Soft-delete post (marca como eliminado, trackea admin)
const deletePost = async (postId, adminId) => {
    const result = await query(
        'UPDATE shared_outfits SET deleted = true, deleted_by = $2 WHERE id = $1 RETURNING id',
        [postId, adminId]
    );
    return result.rows[0];
};

// Restaurar post soft-deleted
const restorePost = async (postId) => {
    const result = await query(
        'UPDATE shared_outfits SET deleted = false, deleted_by = NULL WHERE id = $1 RETURNING id',
        [postId]
    );
    return result.rows[0];
};

// Restaurar usuario desactivado
const restoreUser = async (userId) => {
    const result = await query(
        'UPDATE users SET disabled = false, disabled_by = NULL, updated_at = NOW() WHERE id = $1 RETURNING id, email, full_name',
        [userId]
    );
    return result.rows[0];
};

// Obtener comentarios recientes
const getRecentComments = async (limit = 50) => {
    const result = await query(`
        SELECT c.id, c.text, c.created_at,
               u.full_name AS author_name, u.email AS author_email
        FROM comments c
        JOIN users u ON u.id = c.user_id
        ORDER BY c.created_at DESC
        LIMIT $1
    `, [limit]);
    return result.rows;
};

// Eliminar comentario
const deleteComment = async (commentId) => {
    const result = await query('DELETE FROM comments WHERE id = $1 RETURNING id', [commentId]);
    return result.rows[0];
};

// Estadisticas globales
const getGlobalStats = async () => {
    const [users, garments, outfits, posts, comments, messages] = await Promise.all([
        query('SELECT COUNT(*) AS count FROM users'),
        query('SELECT COUNT(*) AS count FROM garments'),
        query('SELECT COUNT(*) AS count FROM outfits'),
        query('SELECT COUNT(*) AS count FROM shared_outfits WHERE (deleted IS NOT TRUE)'),
        query('SELECT COUNT(*) AS count FROM comments'),
        query('SELECT COUNT(*) AS count FROM messages'),
    ]);
    return {
        totalUsers: parseInt(users.rows[0].count),
        totalGarments: parseInt(garments.rows[0].count),
        totalOutfits: parseInt(outfits.rows[0].count),
        totalPosts: parseInt(posts.rows[0].count),
        totalComments: parseInt(comments.rows[0].count),
        totalMessages: parseInt(messages.rows[0].count),
    };
};

// Estadisticas de admin individual
const getAdminUserStats = async (adminId) => {
    const [wearoPosts, disabledUsers, deletedWearoPosts, deletedUserPosts, resolvedTickets] = await Promise.all([
        query('SELECT COUNT(*) AS count FROM shared_outfits WHERE user_id = $1 AND (deleted IS NOT TRUE)', [adminId]),
        query("SELECT COUNT(*) AS count FROM users WHERE disabled = true AND disabled_by = $1 AND role != 'admin'", [adminId]),
        query(`SELECT COUNT(*) AS count FROM shared_outfits so JOIN users u ON u.id = so.user_id WHERE so.deleted = true AND so.deleted_by = $1 AND u.role = 'admin'`, [adminId]),
        query(`SELECT COUNT(*) AS count FROM shared_outfits so JOIN users u ON u.id = so.user_id WHERE so.deleted = true AND so.deleted_by = $1 AND u.role != 'admin'`, [adminId]),
        query("SELECT COUNT(*) AS count FROM support_tickets WHERE assigned_admin_id = $1 AND status = 'resolved'", [adminId]).catch(() => ({ rows: [{ count: 0 }] })),
    ]);
    return {
        wearoPosts: parseInt(wearoPosts.rows[0].count),
        disabledUsers: parseInt(disabledUsers.rows[0].count),
        deletedWearoPosts: parseInt(deletedWearoPosts.rows[0].count),
        deletedUserPosts: parseInt(deletedUserPosts.rows[0].count),
        resolvedTickets: parseInt(resolvedTickets.rows[0].count),
    };
};

// Mis acciones como admin: usuarios que bloquee, posts que elimine
const getMyActions = async (adminId) => {
    const [disabledUsers, deletedWearoPosts, deletedUserPosts] = await Promise.all([
        query(`
            SELECT id, email, full_name, avatar_url, username, disabled, created_at
            FROM users
            WHERE disabled_by = $1 AND disabled = true
            ORDER BY updated_at DESC
        `, [adminId]),
        query(`
            SELECT so.id, so.caption, so.created_at,
                   u.full_name AS author_name,
                   COALESCE(so.photos, '{}') AS photos,
                   o.name AS outfit_name
            FROM shared_outfits so
            JOIN users u ON u.id = so.user_id
            LEFT JOIN outfits o ON o.id = so.outfit_id
            WHERE so.deleted = true AND so.deleted_by = $1 AND u.role = 'admin'
            ORDER BY so.created_at DESC
        `, [adminId]),
        query(`
            SELECT so.id, so.caption, so.created_at,
                   u.full_name AS author_name,
                   COALESCE(so.photos, '{}') AS photos,
                   o.name AS outfit_name
            FROM shared_outfits so
            JOIN users u ON u.id = so.user_id
            LEFT JOIN outfits o ON o.id = so.outfit_id
            WHERE so.deleted = true AND so.deleted_by = $1 AND u.role != 'admin'
            ORDER BY so.created_at DESC
        `, [adminId]),
    ]);
    return {
        disabledUsers: disabledUsers.rows,
        deletedWearoPosts: deletedWearoPosts.rows,
        deletedUserPosts: deletedUserPosts.rows,
    };
};

// Eliminar cuenta de admin
const deleteAdminUser = async (userId) => {
    // Solo eliminar si es admin
    const check = await query("SELECT role FROM users WHERE id = $1", [userId]);
    if (!check.rows[0] || check.rows[0].role !== 'admin') return null;
    // Eliminar datos relacionados
    await query('DELETE FROM likes WHERE user_id = $1', [userId]);
    await query('DELETE FROM comments WHERE user_id = $1', [userId]);
    await query('DELETE FROM shared_outfits WHERE user_id = $1', [userId]);
    await query('DELETE FROM follows WHERE follower_id = $1 OR following_id = $1', [userId]);
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await query('DELETE FROM messages WHERE sender_id = $1', [userId]);
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id, email, full_name', [userId]);
    return result.rows[0];
};

module.exports = {
    getAllUsers, toggleUserDisabled, createAdminUser, deleteAdminUser,
    getRecentPosts, getRecentUserPosts, getDeletedPosts, deletePost, restorePost, restoreUser,
    getRecentComments, deleteComment,
    getGlobalStats, getAdminUserStats, getMyActions,
};
