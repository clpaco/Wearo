// Controlador Social — feed público, compartir outfits y likes
const socialModel = require('../models/social.model');
const userModel = require('../models/user.model');

// POST /api/v1/social/share — Compartir outfit o prendas al feed público (con fotos opcionales)
const share = async (req, res) => {
    try {
        const { outfitId, caption } = req.body;
        let garmentIds = req.body.garmentIds || [];

        // Parse garmentIds si viene como string (FormData)
        if (typeof garmentIds === 'string') {
            try { garmentIds = JSON.parse(garmentIds); } catch { garmentIds = []; }
        }

        if (!outfitId && (!garmentIds || garmentIds.length === 0)) {
            // Admin puede publicar anuncios sin outfit ni prendas
            const currentUser = await userModel.findById(req.user.id);
            if (!currentUser || currentUser.role !== 'admin') {
                return res.status(400).json({ error: true, mensaje: 'Selecciona un outfit o al menos una prenda' });
            }
        }

        if (outfitId) {
            const existing = await socialModel.isShared(req.user.id, outfitId);
            if (existing) {
                return res.status(409).json({ error: true, mensaje: 'Este outfit ya está compartido' });
            }
        }

        // Recoger rutas de fotos subidas por multer
        const photos = (req.files || []).map((f) => `/uploads/social/${f.filename}`);

        const post = await socialModel.shareOutfit(req.user.id, outfitId || null, caption || '', photos, garmentIds.map(Number));
        res.status(201).json({ mensaje: 'Publicación compartida al feed', post });
    } catch (err) {
        console.error('Error compartiendo:', err);
        res.status(500).json({ error: true, mensaje: 'Error al compartir' });
    }
};

// DELETE /api/v1/social/:id — Quitar outfit del feed
const unshare = async (req, res) => {
    try {
        const currentUser = await userModel.findById(req.user.id);
        let removed;
        if (currentUser && currentUser.role === 'admin') {
            removed = await socialModel.deletePostAdmin(req.params.id, req.user.id);
        } else {
            removed = await socialModel.unshareOutfit(req.user.id, req.params.id);
        }
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
        const mode = req.query.mode === 'following' ? 'following' : 'discover';
        const posts = await socialModel.getFeed(req.user.id, { limit, offset, mode });
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

// GET /api/v1/social/:id/likers — Lista de quien dio like
const getLikers = async (req, res) => {
    try {
        const likers = await socialModel.getLikers(req.params.id);
        res.json({ likers });
    } catch (err) {
        console.error('Error obteniendo likers:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener likes' });
    }
};

module.exports = { share, unshare, getFeed, getMine, like, unlike, getLikers, getComments, addComment, deleteComment, search };

// GET /api/v1/social/search?q=... — Buscar publicaciones y usuarios
async function search(req, res) {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({ posts: [], users: [] });
        }
        const [posts, users] = await Promise.all([
            socialModel.searchPosts(req.user.id, q, 20),
            socialModel.searchUsers(q, 10),
        ]);
        res.json({ posts, users });
    } catch (err) {
        console.error('Error buscando:', err);
        res.status(500).json({ error: true, mensaje: 'Error en la búsqueda' });
    }
}

// GET /api/v1/social/:id/comments — Obtener comentarios de un post
async function getComments(req, res) {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const comments = await socialModel.getComments(req.params.id, {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        });
        res.json({ comments });
    } catch (err) {
        console.error('Error obteniendo comentarios:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener comentarios' });
    }
}

// POST /api/v1/social/:id/comments — Añadir comentario
async function addComment(req, res) {
    try {
        const { text, parentId } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: true, mensaje: 'El texto del comentario es obligatorio' });
        }
        if (text.trim().length > 500) {
            return res.status(400).json({ error: true, mensaje: 'El comentario no puede superar 500 caracteres' });
        }
        const comment = await socialModel.addComment(req.user.id, req.params.id, text.trim(), parentId || null);
        res.status(201).json({ mensaje: 'Comentario añadido', comment });
    } catch (err) {
        console.error('Error añadiendo comentario:', err);
        res.status(500).json({ error: true, mensaje: 'Error al añadir comentario' });
    }
}

// DELETE /api/v1/social/:id/comments/:commentId — Eliminar comentario
async function deleteComment(req, res) {
    try {
        const currentUser = await userModel.findById(req.user.id);
        let removed;
        if (currentUser && currentUser.role === 'admin') {
            removed = await socialModel.deleteCommentAdmin(req.params.commentId);
        } else {
            removed = await socialModel.deleteComment(req.user.id, req.params.commentId);
        }
        if (!removed) {
            return res.status(404).json({ error: true, mensaje: 'Comentario no encontrado o no te pertenece' });
        }
        res.json({ mensaje: 'Comentario eliminado' });
    } catch (err) {
        console.error('Error eliminando comentario:', err);
        res.status(500).json({ error: true, mensaje: 'Error al eliminar comentario' });
    }
}
