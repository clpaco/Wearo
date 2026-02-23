// Modelo de Seguidores — operaciones follow/unfollow
const { query } = require('../config/db');

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

module.exports = { follow, unfollow, isFollowing, getFollowers, getFollowing, countFollowers, countFollowing };
