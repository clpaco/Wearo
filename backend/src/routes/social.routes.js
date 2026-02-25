// Rutas del módulo social
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth.middleware');
const { share, unshare, getFeed, getMine, like, unlike, getLikers, getComments, addComment, deleteComment, search } = require('../controllers/social.controller');

// Multer para fotos de publicaciones sociales
const SOCIAL_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'social');
if (!fs.existsSync(SOCIAL_DIR)) fs.mkdirSync(SOCIAL_DIR, { recursive: true });

const socialUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, SOCIAL_DIR),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.mimetype);
        cb(ok ? null : new Error('Solo imágenes permitidas'), ok);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(verifyToken);

// GET /api/v1/social/search?q=... — Buscar publicaciones y usuarios (antes de :id)
router.get('/search', search);

// GET /api/v1/social/feed?limit=20&offset=0 — Feed público
router.get('/feed', getFeed);

// GET /api/v1/social/mine — Mis outfits compartidos
router.get('/mine', getMine);

// POST /api/v1/social/share — Compartir outfit (con fotos opcionales, max 5)
router.post('/share', socialUpload.array('photos', 5), share);

// DELETE /api/v1/social/:id — Retirar del feed
router.delete('/:id', unshare);

// POST /api/v1/social/:id/like — Dar like
router.post('/:id/like', like);

// DELETE /api/v1/social/:id/like — Quitar like
router.delete('/:id/like', unlike);

// GET /api/v1/social/:id/likers — Lista de quien dio like
router.get('/:id/likers', getLikers);

// GET /api/v1/social/:id/comments — Obtener comentarios
router.get('/:id/comments', getComments);

// POST /api/v1/social/:id/comments — Añadir comentario
router.post('/:id/comments', addComment);

// DELETE /api/v1/social/:id/comments/:commentId — Eliminar comentario
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;
