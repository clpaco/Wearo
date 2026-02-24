// Rutas del calendario
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getRange,
    getByDate,
    assign,
    remove,
    getWeather,
    getForecast,
    markWorn,
} = require('../controllers/calendar.controller');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/v1/calendar/weather?lat=&lon= — Clima actual (antes de :date)
router.get('/weather', getWeather);

// GET /api/v1/calendar/forecast?lat=&lon= — Pronóstico 5 días
router.get('/forecast', getForecast);

// GET /api/v1/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD — Entradas del mes
router.get('/', getRange);

// GET /api/v1/calendar/:date — Detalle de un día
router.get('/:date', getByDate);

// POST /api/v1/calendar — Asignar outfit a fecha
router.post('/', assign);

// DELETE /api/v1/calendar/:date — Eliminar entrada
router.delete('/:date', remove);

// POST /api/v1/calendar/:date/worn — Marcar outfit como usado
router.post('/:date/worn', markWorn);

module.exports = router;
