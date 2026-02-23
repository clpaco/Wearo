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
} = require('../controllers/outfits.controller');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/v1/outfits — Listar outfits (filtros: ?occasion=&season=&favorite=)
router.get('/', getAll);

// GET /api/v1/outfits/:id — Detalle de outfit con sus prendas
router.get('/:id', getById);

// POST /api/v1/outfits — Crear outfit (body: name, garmentIds[])
router.post('/', create);

// PUT /api/v1/outfits/:id — Actualizar outfit
router.put('/:id', update);

// DELETE /api/v1/outfits/:id — Eliminar outfit
router.delete('/:id', remove);

module.exports = router;
