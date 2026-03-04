// Rutas de outfits
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getAll,
    getById,
    create,
    update,
    remove,
    outfitUpload,
} = require('../controllers/outfits.controller');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/v1/outfits — Listar outfits (filtros: ?occasion=&season=&favorite=)
router.get('/', getAll);

// GET /api/v1/outfits/:id — Detalle de outfit con sus prendas
router.get('/:id', getById);

// POST /api/v1/outfits — Crear outfit (body: name, garmentIds[], coverImage opcional)
router.post('/', (req, res, next) => {
    outfitUpload.single('coverImage')(req, res, (err) => {
        if (err) {
            console.error('Multer error (outfit create):', err.message);
            return res.status(400).json({ error: true, mensaje: err.message });
        }
        next();
    });
}, create);

// PUT /api/v1/outfits/:id — Actualizar outfit
router.put('/:id', (req, res, next) => {
    outfitUpload.single('coverImage')(req, res, (err) => {
        if (err) {
            console.error('Multer error (outfit update):', err.message);
            return res.status(400).json({ error: true, mensaje: err.message });
        }
        next();
    });
}, update);

// DELETE /api/v1/outfits/:id — Eliminar outfit
router.delete('/:id', remove);

module.exports = router;
