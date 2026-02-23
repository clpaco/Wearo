// Controlador Social — feed público, compartir outfits y likes
const socialModel = require('../models/social.model');

// POST /api/v1/social/share — Compartir outfit al feed público
const share = async (req, res) => {
    try {
        const { outfitId, caption } = req.body;
        if (!outfitId) {
            return res.status(400).json({ error: true, mensaje: 'outfitId es obligatorio' });
        }

        const existing = await socialModel.isShared(req.user.id, outfitId);
        if (existing) {
            return res.status(409).json({ error: true, mensaje: 'Este outfit ya está compartido' });
        }

        const post = await socialModel.shareOutfit(req.user.id, outfitId, caption || '');
        res.status(201).json({ mensaje: 'Outfit compartido al feed', post });
    } catch (err) {
        console.error('Error compartiendo outfit:', err);
        res.status(500).json({ error: true, mensaje: 'Error al compartir outfit' });
    }
};

// DELETE /api/v1/social/:id — Quitar outfit del feed
const unshare = async (req, res) => {
    try {
        const removed = await socialModel.unshareOutfit(req.user.id, req.params.id);
        if (!removed) {
            return res.status(404).json({ error: true, mensaje: 'Post no encontrado o no te pertenece' });
        }
        res.json({ mensaje: 'Outfit retirado del feed' });
    } catch (err) {
        console.error('Error retirando outfit:', err);
        res.status(500).json({ error: true, mensaje: 'Error al retirar outfit' });
    }
};

// GET /api/v1/social/feed — Feed público con paginación
const getFeed = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;
        const posts = await socialModel.getFeed(req.user.id, { limit, offset });
        res.json({ posts, hasMore: posts.length === limit });
    } catch (err) {
        console.error('Error obteniendo feed:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener el feed' });
    }
};

// GET /api/v1/social/mine — Mis outfits compartidos
const getMine = async (req, res) => {
    try {
        const posts = await socialModel.getMyShared(req.user.id);
        res.json({ posts });
    } catch (err) {
        console.error('Error obteniendo mis compartidos:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener tus compartidos' });
    }
};

// POST /api/v1/social/:id/like — Dar like
const like = async (req, res) => {
    try {
        await socialModel.addLike(req.user.id, req.params.id);
        const count = await socialModel.getLikeCount(req.params.id);
        res.json({ mensaje: 'Like añadido', likeCount: count, likedByMe: true });
    } catch (err) {
        console.error('Error dando like:', err);
        res.status(500).json({ error: true, mensaje: 'Error al dar like' });
    }
};

// DELETE /api/v1/social/:id/like — Quitar like
const unlike = async (req, res) => {
    try {
        await socialModel.removeLike(req.user.id, req.params.id);
        const count = await socialModel.getLikeCount(req.params.id);
        res.json({ mensaje: 'Like eliminado', likeCount: count, likedByMe: false });
    } catch (err) {
        console.error('Error quitando like:', err);
        res.status(500).json({ error: true, mensaje: 'Error al quitar like' });
    }
};

module.exports = { share, unshare, getFeed, getMine, like, unlike };
