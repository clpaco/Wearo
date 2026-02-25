// Rutas del calendario
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getRange,
    getByDate,
    assign,
    removeEntry,
    getWeather,
    getForecast,
} = require('../controllers/calendar.controller');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/v1/calendar/weather?lat=&lon= — Clima actual (antes de :date)
router.get('/weather', getWeather);

// GET /api/v1/calendar/forecast?lat=&lon= — Pronóstico 5 días
router.get('/forecast', getForecast);

// GET /api/v1/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD — Entradas del mes
router.get('/', getRange);

// GET /api/v1/calendar/:date — Entradas de un día
router.get('/:date', getByDate);

// POST /api/v1/calendar — Añadir entrada (outfit o prendas sueltas)
router.post('/', assign);

// DELETE /api/v1/calendar/entry/:id — Eliminar entrada por ID
router.delete('/entry/:id', removeEntry);

module.exports = router;
