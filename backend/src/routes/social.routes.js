// Rutas del módulo social
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { share, unshare, getFeed, getMine, like, unlike, getComments, addComment, deleteComment } = require('../controllers/social.controller');

router.use(verifyToken);

// GET /api/v1/social/feed?limit=20&offset=0 — Feed público
router.get('/feed', getFeed);

// GET /api/v1/social/mine — Mis outfits compartidos
router.get('/mine', getMine);

// POST /api/v1/social/share — Compartir outfit
router.post('/share', share);

// DELETE /api/v1/social/:id — Retirar del feed
router.delete('/:id', unshare);

// POST /api/v1/social/:id/like — Dar like
router.post('/:id/like', like);

// DELETE /api/v1/social/:id/like — Quitar like
router.delete('/:id/like', unlike);

// GET /api/v1/social/:id/comments — Obtener comentarios
router.get('/:id/comments', getComments);

// POST /api/v1/social/:id/comments — Añadir comentario
router.post('/:id/comments', addComment);

// DELETE /api/v1/social/:id/comments/:commentId — Eliminar comentario
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;
