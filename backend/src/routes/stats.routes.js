// Rutas de estadísticas
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getAll,
    getOverview,
    getByCategory,
    getByColor,
    getBySeason,
    getTopOutfits,
    getActivity,
    getTopGarments,
} = require('../controllers/stats.controller');

router.use(verifyToken);

// GET /api/v1/stats — Todas las estadísticas en una llamada
router.get('/', getAll);

// Endpoints individuales
router.get('/overview', getOverview);
router.get('/categories', getByCategory);
router.get('/colors', getByColor);
router.get('/seasons', getBySeason);
router.get('/top-outfits', getTopOutfits);
router.get('/activity', getActivity);
router.get('/top-garments', getTopGarments);

module.exports = router;
