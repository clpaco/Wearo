// Rutas del módulo IA
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { weatherRecommend, chat, shopping } = require('../controllers/ai.controller');

router.use(verifyToken);

// POST /api/v1/ai/weather-recommend — Sugerencia outfit por clima
router.post('/weather-recommend', weatherRecommend);

// POST /api/v1/ai/chat — Chat IA sobre armario
router.post('/chat', chat);

// POST /api/v1/ai/shopping — Recomendaciones de compra
router.post('/shopping', shopping);

module.exports = router;
