// Controlador de Perfil — GET/PUT perfil, follow/unfollow, seguidores
const profileModel = require('../models/user-profile.model');
const followModel  = require('../models/follow.model');
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
        cb(ok ? null : new Error('Solo imágenes permitidas'), ok);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

// GET /api/v1/users/me — Mi perfil
const getMe = async (req, res) => {
    try {
        const profile = await profileModel.getUserProfile(req.user.id, req.user.id);
        if (!profile) return res.status(404).json({ error: true, mensaje: 'Perfil no encontrado' });
        res.json({ profile });
    } catch (err) {
        console.error('Error getMe:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener perfil' });
    }
};

// GET /api/v1/users/:id — Perfil público
const getProfile = async (req, res) => {
    try {
        const profile = await profileModel.getUserProfile(req.params.id, req.user.id);
        if (!profile) return res.status(404).json({ error: true, mensaje: 'Usuario no encontrado' });
        const following = await followModel.isFollowing(req.user.id, req.params.id);
        res.json({ profile: { ...profile, is_following: following } });
    } catch (err) {
        console.error('Error getProfile:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener perfil' });
    }
};

// PUT /api/v1/users/me — Actualizar perfil
const updateMe = async (req, res) => {
    try {
        const { fullName, bio } = req.body;
        const updated = await profileModel.updateProfile(req.user.id, { fullName, bio });
        res.json({ mensaje: 'Perfil actualizado', profile: updated });
    } catch (err) {
        console.error('Error updateMe:', err);
        res.status(500).json({ error: true, mensaje: 'Error al actualizar perfil' });
    }
};

// PUT /api/v1/users/me/avatar — Subir avatar
const uploadAvatar = (req, res) => {
    avatarUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ error: true, mensaje: err.message });
        if (!req.file) return res.status(400).json({ error: true, mensaje: 'No se proporcionó imagen' });
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
        const limit  = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;
        const posts  = await profileModel.getUserPosts(req.params.id, req.user.id, { limit, offset });
        res.json({ posts, hasMore: posts.length === limit });
    } catch (err) {
        console.error('Error getUserPosts:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener posts' });
    }
};

// POST /api/v1/users/:id/follow — Seguir usuario
const followUser = async (req, res) => {
    try {
        if (String(req.params.id) === String(req.user.id)) {
            return res.status(400).json({ error: true, mensaje: 'No puedes seguirte a ti mismo' });
        }
        await followModel.follow(req.user.id, req.params.id);
        const [followers, following] = await Promise.all([
            followModel.countFollowers(req.params.id),
            followModel.countFollowing(req.params.id),
        ]);
        res.json({ mensaje: 'Siguiendo', is_following: true, follower_count: followers, following_count: following });
    } catch (err) {
        console.error('Error followUser:', err);
        res.status(500).json({ error: true, mensaje: 'Error al seguir usuario' });
    }
};

// DELETE /api/v1/users/:id/follow — Dejar de seguir
const unfollowUser = async (req, res) => {
    try {
        await followModel.unfollow(req.user.id, req.params.id);
        const [followers, following] = await Promise.all([
            followModel.countFollowers(req.params.id),
            followModel.countFollowing(req.params.id),
        ]);
        res.json({ mensaje: 'Dejado de seguir', is_following: false, follower_count: followers, following_count: following });
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
        const users  = await followModel.getFollowers(req.params.id, { limit, offset });
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
        const users  = await followModel.getFollowing(req.params.id, { limit, offset });
        res.json({ users });
    } catch (err) {
        console.error('Error getFollowing:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener seguidos' });
    }
};

module.exports = { getMe, getProfile, updateMe, uploadAvatar, getUserPosts, followUser, unfollowUser, getFollowers, getFollowing };
