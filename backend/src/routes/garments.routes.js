// Rutas de prendas (garments)
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
    getAll,
    getById,
    create,
    update,
    remove,
    getCategories,
    detectColor,
} = require('../controllers/garments.controller');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/v1/garments/categories — Categorías (antes de :id para evitar conflicto)
router.get('/categories', getCategories);

// POST /api/v1/garments/detect-color — Detectar color dominante (antes de :id)
router.post('/detect-color', upload.single('image'), detectColor);

// GET /api/v1/garments — Listar prendas (con filtros query: ?category=&color=&season=&favorite=)
router.get('/', getAll);

// GET /api/v1/garments/:id — Detalle de prenda
router.get('/:id', getById);

// POST /api/v1/garments — Crear prenda (con imagen opcional)
router.post('/', upload.single('image'), create);

// PUT /api/v1/garments/:id — Actualizar prenda (con imagen opcional)
router.put('/:id', upload.single('image'), update);

// DELETE /api/v1/garments/:id — Eliminar prenda
router.delete('/:id', remove);

module.exports = router;
