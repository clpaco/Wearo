// Modelo de Seguidores — operaciones follow/unfollow + solicitudes
const { query } = require('../config/db');

// Auto-migration: tabla de solicitudes de seguimiento
query(`
    CREATE TABLE IF NOT EXISTS follow_requests (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(requester_id, target_id)
    )
`).catch(() => {});

// Seguir a un usuario
const follow = async (followerId, followingId) => {
    const result = await query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_id, following_id) DO NOTHING
         RETURNING *`,
        [followerId, followingId]
    );
    return result.rows[0] || null;
};

// Dejar de seguir a un usuario
const unfollow = async (followerId, followingId) => {
    const result = await query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING id',
        [followerId, followingId]
    );
    return result.rows[0] || null;
};

// Verificar si un usuario sigue a otro
const isFollowing = async (followerId, followingId) => {
    const result = await query(
        'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
    );
    return !!result.rows[0];
};

// Obtener seguidores de un usuario
const getFollowers = async (userId, { limit = 30, offset = 0 } = {}) => {
    const result = await query(
        `SELECT u.id, u.full_name, u.avatar_url, f.created_at AS followed_at
         FROM follows f
         JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
};

// Obtener usuarios que sigue un usuario
const getFollowing = async (userId, { limit = 30, offset = 0 } = {}) => {
    const result = await query(
        `SELECT u.id, u.full_name, u.avatar_url, f.created_at AS followed_at
         FROM follows f
         JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
};

// Contar seguidores de un usuario
const countFollowers = async (userId) => {
    const result = await query(
        'SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1',
        [userId]
    );
    return result.rows[0].count;
};

// Contar usuarios seguidos
const countFollowing = async (userId) => {
    const result = await query(
        'SELECT COUNT(*)::int AS count FROM follows WHERE follower_id = $1',
        [userId]
    );
    return result.rows[0].count;
};

// ── Solicitudes de seguimiento ──────────────────────────────────────────────

// Crear solicitud de seguimiento
const createFollowRequest = async (requesterId, targetId) => {
    const result = await query(
        `INSERT INTO follow_requests (requester_id, target_id)
         VALUES ($1, $2)
         ON CONFLICT (requester_id, target_id) DO NOTHING
         RETURNING *`,
        [requesterId, targetId]
    );
    return result.rows[0] || null;
};

// Verificar si existe solicitud pendiente
const hasPendingRequest = async (requesterId, targetId) => {
    const result = await query(
        'SELECT id FROM follow_requests WHERE requester_id = $1 AND target_id = $2',
        [requesterId, targetId]
    );
    return !!result.rows[0];
};

// Obtener solicitudes entrantes para un usuario
const getIncomingRequests = async (userId) => {
    const result = await query(
        `SELECT fr.id, fr.created_at,
            json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url, 'username', u.username) AS requester
         FROM follow_requests fr
         JOIN users u ON fr.requester_id = u.id
         WHERE fr.target_id = $1
         ORDER BY fr.created_at DESC`,
        [userId]
    );
    return result.rows;
};

// Contar solicitudes pendientes
const countPendingRequests = async (userId) => {
    const result = await query(
        'SELECT COUNT(*)::int AS count FROM follow_requests WHERE target_id = $1',
        [userId]
    );
    return result.rows[0].count;
};

// Aceptar solicitud: mover a follows y eliminar request
const acceptFollowRequest = async (requestId, userId) => {
    const req = await query(
        'SELECT * FROM follow_requests WHERE id = $1 AND target_id = $2',
        [requestId, userId]
    );
    if (!req.rows[0]) return null;
    const { requester_id, target_id } = req.rows[0];
    await query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_id, following_id) DO NOTHING`,
        [requester_id, target_id]
    );
    await query('DELETE FROM follow_requests WHERE id = $1', [requestId]);
    return { requester_id, target_id };
};

// Rechazar solicitud
const rejectFollowRequest = async (requestId, userId) => {
    const result = await query(
        'DELETE FROM follow_requests WHERE id = $1 AND target_id = $2 RETURNING id',
        [requestId, userId]
    );
    return result.rows[0] || null;
};

// Cancelar solicitud enviada
const cancelFollowRequest = async (requesterId, targetId) => {
    const result = await query(
        'DELETE FROM follow_requests WHERE requester_id = $1 AND target_id = $2 RETURNING id',
        [requesterId, targetId]
    );
    return result.rows[0] || null;
};

module.exports = {
    follow, unfollow, isFollowing, getFollowers, getFollowing, countFollowers, countFollowing,
    createFollowRequest, hasPendingRequest, getIncomingRequests, countPendingRequests,
    acceptFollowRequest, rejectFollowRequest, cancelFollowRequest,
};
