// Controlador de Perfil — GET/PUT perfil, follow/unfollow, seguidores, solicitudes
const profileModel = require('../models/user-profile.model');
const followModel  = require('../models/follow.model');
const { query: dbQuery } = require('../config/db');
const path = require('path');
const fs   = require('fs');
const multer = require('multer');

// Multer para avatares
const AVATAR_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.mimetype);
        cb(ok ? null : new Error('Solo imagenes permitidas'), ok);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

// GET /api/v1/users/me — Mi perfil
const getMe = async (req, res) => {
    try {
        // Verificar si la cuenta esta desactivada
        const userCheck = await dbQuery('SELECT disabled FROM users WHERE id = $1', [req.user.id]);
        if (userCheck.rows[0]?.disabled) {
            return res.status(403).json({ error: true, mensaje: 'Tu cuenta ha sido desactivada', code: 'ACCOUNT_DISABLED' });
        }
        const profile = await profileModel.getUserProfile(req.user.id, req.user.id);
        if (!profile) return res.status(404).json({ error: true, mensaje: 'Perfil no encontrado' });
        const pendingCount = await followModel.countPendingRequests(req.user.id);
        res.json({ profile: { ...profile, pending_requests_count: pendingCount } });
    } catch (err) {
        console.error('Error getMe:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener perfil' });
    }
};

// GET /api/v1/users/:id — Perfil publico
const getProfile = async (req, res) => {
    try {
        const profile = await profileModel.getUserProfile(req.params.id, req.user.id);
        if (!profile) return res.status(404).json({ error: true, mensaje: 'Usuario no encontrado' });
        // Non-admin users cannot see disabled profiles
        if (profile.disabled) {
            const currentUser = await dbQuery('SELECT role FROM users WHERE id = $1', [req.user.id]);
            if (!currentUser.rows[0] || currentUser.rows[0].role !== 'admin') {
                return res.status(404).json({ error: true, mensaje: 'Usuario no encontrado' });
            }
        }
        const [following, pendingRequest] = await Promise.all([
            followModel.isFollowing(req.user.id, req.params.id),
            followModel.hasPendingRequest(req.user.id, req.params.id),
        ]);
        res.json({ profile: { ...profile, is_following: following, has_pending_request: pendingRequest } });
    } catch (err) {
        console.error('Error getProfile:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener perfil' });
    }
};

// PUT /api/v1/users/me — Actualizar perfil
const updateMe = async (req, res) => {
    try {
        const { fullName, bio, isPublic, username, gender, stylePreferences, onboardingDone, adminTag } = req.body;
        const updated = await profileModel.updateProfile(req.user.id, {
            fullName, bio, isPublic, username, gender, stylePreferences, onboardingDone, adminTag,
        });
        res.json({ mensaje: 'Perfil actualizado', profile: updated });
    } catch (err) {
        if (err.constraint === 'idx_users_username') {
            return res.status(409).json({ error: true, mensaje: 'Ese nombre de usuario ya esta en uso' });
        }
        console.error('Error updateMe:', err);
        res.status(500).json({ error: true, mensaje: 'Error al actualizar perfil' });
    }
};

// PUT /api/v1/users/me/avatar — Subir avatar
const uploadAvatar = (req, res) => {
    avatarUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ error: true, mensaje: err.message });
        if (!req.file) return res.status(400).json({ error: true, mensaje: 'No se proporciono imagen' });
        try {
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            const updated = await profileModel.updateProfile(req.user.id, { avatarUrl });
            res.json({ mensaje: 'Avatar actualizado', avatarUrl: updated.avatar_url, profile: updated });
        } catch (e) {
            console.error('Error uploadAvatar:', e);
            res.status(500).json({ error: true, mensaje: 'Error al guardar el avatar' });
        }
    });
};

// GET /api/v1/users/:id/posts — Posts compartidos de un usuario
const getUserPosts = async (req, res) => {
    try {
        const targetId = req.params.id;
        if (String(targetId) !== String(req.user.id)) {
            const targetUser = await dbQuery('SELECT is_public, disabled, role FROM users WHERE id = $1', [targetId]);
            const row = targetUser.rows[0];
            if (!row) return res.json({ posts: [], hasMore: false });

            // Si usuario desactivado, solo admin puede ver posts
            if (row.disabled) {
                const currentUser = await dbQuery('SELECT role FROM users WHERE id = $1', [req.user.id]);
                if (!currentUser.rows[0] || currentUser.rows[0].role !== 'admin') {
                    return res.json({ posts: [], hasMore: false });
                }
            }

            // Si perfil privado y no lo sigues, no mostrar posts
            const isPublic = row.is_public !== false;
            if (!isPublic) {
                const follows = await followModel.isFollowing(req.user.id, targetId);
                if (!follows) {
                    return res.json({ posts: [], hasMore: false });
                }
            }
        }
        const limit  = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;

        // Si el target es admin, mostrar todos los posts de admin (perfil Wearo compartido)
        const targetRole = await dbQuery('SELECT role FROM users WHERE id = $1', [targetId]);
        if (targetRole.rows[0]?.role === 'admin') {
            const posts = await profileModel.getAllAdminPosts(req.user.id, { limit, offset });
            return res.json({ posts, hasMore: posts.length === limit });
        }

        const posts  = await profileModel.getUserPosts(targetId, req.user.id, { limit, offset });
        res.json({ posts, hasMore: posts.length === limit });
    } catch (err) {
        console.error('Error getUserPosts:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener posts' });
    }
};

// POST /api/v1/users/:id/follow — Seguir usuario (o solicitar si es privado)
const followUser = async (req, res) => {
    try {
        if (String(req.params.id) === String(req.user.id)) {
            return res.status(400).json({ error: true, mensaje: 'No puedes seguirte a ti mismo' });
        }
        // Comprobar rol y visibilidad del usuario objetivo
        const targetUser = await dbQuery('SELECT is_public, role FROM users WHERE id = $1', [req.params.id]);
        const isPublic = targetUser.rows[0]?.is_public !== false;
        const isTargetAdmin = targetUser.rows[0]?.role === 'admin';

        if (!isPublic && !isTargetAdmin) {
            // Perfil privado (no admin): crear solicitud
            await followModel.createFollowRequest(req.user.id, req.params.id);
            return res.json({ mensaje: 'Solicitud enviada', is_following: false, has_pending_request: true });
        }

        // Si target es admin, seguir a TODOS los admins (identidad Wearo compartida)
        if (isTargetAdmin) {
            await followModel.followAllAdmins(req.user.id);
        } else {
            await followModel.follow(req.user.id, req.params.id);
        }
        const [followers, following] = await Promise.all([
            followModel.countFollowers(req.params.id),
            followModel.countFollowing(req.params.id),
        ]);
        res.json({ mensaje: 'Siguiendo', is_following: true, has_pending_request: false, follower_count: followers, following_count: following });
    } catch (err) {
        console.error('Error followUser:', err);
        res.status(500).json({ error: true, mensaje: 'Error al seguir usuario' });
    }
};

// DELETE /api/v1/users/:id/follow — Dejar de seguir o cancelar solicitud
const unfollowUser = async (req, res) => {
    try {
        // Comprobar si el target es admin (identidad Wearo compartida)
        const targetRole = await dbQuery('SELECT role FROM users WHERE id = $1', [req.params.id]);
        if (targetRole.rows[0]?.role === 'admin') {
            // Dejar de seguir a TODOS los admins
            await followModel.unfollowAllAdmins(req.user.id);
        } else {
            await followModel.unfollow(req.user.id, req.params.id);
            await followModel.cancelFollowRequest(req.user.id, req.params.id);
        }
        const [followers, following] = await Promise.all([
            followModel.countFollowers(req.params.id),
            followModel.countFollowing(req.params.id),
        ]);
        res.json({ mensaje: 'Dejado de seguir', is_following: false, has_pending_request: false, follower_count: followers, following_count: following });
    } catch (err) {
        console.error('Error unfollowUser:', err);
        res.status(500).json({ error: true, mensaje: 'Error al dejar de seguir' });
    }
};

// GET /api/v1/users/:id/followers — Lista de seguidores
const getFollowers = async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit, 10) || 30;
        const offset = parseInt(req.query.offset, 10) || 0;
        // Si target es admin, agregar seguidores de TODOS los admins
        const targetRole = await dbQuery('SELECT role FROM users WHERE id = $1', [req.params.id]);
        let users;
        if (targetRole.rows[0]?.role === 'admin') {
            users = await followModel.getFollowersOfAllAdmins({ limit, offset });
        } else {
            users = await followModel.getFollowers(req.params.id, { limit, offset });
        }
        res.json({ users });
    } catch (err) {
        console.error('Error getFollowers:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener seguidores' });
    }
};

// GET /api/v1/users/:id/following — Lista de seguidos
const getFollowing = async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit, 10) || 30;
        const offset = parseInt(req.query.offset, 10) || 0;
        // Si target es admin, agregar seguidos de TODOS los admins
        const targetRole = await dbQuery('SELECT role FROM users WHERE id = $1', [req.params.id]);
        let users;
        if (targetRole.rows[0]?.role === 'admin') {
            users = await followModel.getFollowingOfAllAdmins({ limit, offset });
        } else {
            users = await followModel.getFollowing(req.params.id, { limit, offset });
        }
        res.json({ users });
    } catch (err) {
        console.error('Error getFollowing:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener seguidos' });
    }
};

// ── Solicitudes de seguimiento ──────────────────────────────────────────────

// GET /api/v1/users/me/requests — Mis solicitudes pendientes de aceptar
const getMyRequests = async (req, res) => {
    try {
        const requests = await followModel.getIncomingRequests(req.user.id);
        res.json({ requests });
    } catch (err) {
        console.error('Error getMyRequests:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener solicitudes' });
    }
};

// POST /api/v1/users/me/requests/:requestId/accept — Aceptar solicitud
const acceptRequest = async (req, res) => {
    try {
        const result = await followModel.acceptFollowRequest(req.params.requestId, req.user.id);
        if (!result) return res.status(404).json({ error: true, mensaje: 'Solicitud no encontrada' });
        res.json({ mensaje: 'Solicitud aceptada' });
    } catch (err) {
        console.error('Error acceptRequest:', err);
        res.status(500).json({ error: true, mensaje: 'Error al aceptar solicitud' });
    }
};

// POST /api/v1/users/me/requests/:requestId/reject — Rechazar solicitud
const rejectRequest = async (req, res) => {
    try {
        const result = await followModel.rejectFollowRequest(req.params.requestId, req.user.id);
        if (!result) return res.status(404).json({ error: true, mensaje: 'Solicitud no encontrada' });
        res.json({ mensaje: 'Solicitud rechazada' });
    } catch (err) {
        console.error('Error rejectRequest:', err);
        res.status(500).json({ error: true, mensaje: 'Error al rechazar solicitud' });
    }
};

module.exports = {
    getMe, getProfile, updateMe, uploadAvatar, getUserPosts,
    followUser, unfollowUser, getFollowers, getFollowing,
    getMyRequests, acceptRequest, rejectRequest,
};
