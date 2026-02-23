// Controlador de Calendario — planificación de outfits + clima
const calendarModel = require('../models/calendar.model');
const weatherService = require('../services/weather.service');

// GET /api/v1/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD — Entradas del mes
const getRange = async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({
                error: true,
                mensaje: 'Parámetros start y end son obligatorios (YYYY-MM-DD)',
            });
        }

        const entries = await calendarModel.findByRange(req.user.id, start, end);
        res.json({ mensaje: 'Calendario obtenido', entradas: entries });
    } catch (err) {
        console.error('Error obteniendo calendario:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener el calendario' });
    }
};

// GET /api/v1/calendar/:date — Detalle de un día
const getByDate = async (req, res) => {
    try {
        const entry = await calendarModel.findByDate(req.user.id, req.params.date);
        res.json({ entrada: entry });
    } catch (err) {
        console.error('Error obteniendo entrada:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener la entrada' });
    }
};

// POST /api/v1/calendar — Asignar outfit a una fecha (upsert)
const assign = async (req, res) => {
    try {
        const { date, outfitId, notes } = req.body;
        if (!date) {
            return res.status(400).json({ error: true, mensaje: 'La fecha es obligatoria' });
        }

        const entry = await calendarModel.upsert(req.user.id, {
            date, outfitId, notes,
        });

        res.status(201).json({ mensaje: 'Outfit asignado al calendario', entrada: entry });
    } catch (err) {
        console.error('Error asignando outfit:', err);
        res.status(500).json({ error: true, mensaje: 'Error al asignar outfit' });
    }
};

// DELETE /api/v1/calendar/:date — Eliminar entrada del calendario
const remove = async (req, res) => {
    try {
        const entry = await calendarModel.remove(req.user.id, req.params.date);
        if (!entry) {
            return res.status(404).json({ error: true, mensaje: 'No hay entrada para esa fecha' });
        }
        res.json({ mensaje: 'Entrada eliminada del calendario' });
    } catch (err) {
        console.error('Error eliminando entrada:', err);
        res.status(500).json({ error: true, mensaje: 'Error al eliminar entrada' });
    }
};

// GET /api/v1/calendar/weather?city= ó ?lat=&lon= — Clima actual
const getWeather = async (req, res) => {
    try {
        const { lat, lon, city } = req.query;
        let weather;
        if (city) {
            weather = await weatherService.getWeatherByCity(city);
        } else if (lat && lon) {
            weather = await weatherService.getCurrentWeather(lat, lon);
        } else {
            return res.status(400).json({
                error: true,
                mensaje: 'Proporciona city o los parámetros lat y lon',
            });
        }

        if (!weather) {
            return res.json({
                mensaje: 'Clima no disponible (configura WEATHER_API_KEY)',
                clima: null,
            });
        }

        res.json({ clima: weather });
    } catch (err) {
        console.error('Error obteniendo clima:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener el clima' });
    }
};

// GET /api/v1/calendar/forecast?lat=&lon= — Pronóstico 5 días
const getForecast = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({
                error: true,
                mensaje: 'Parámetros lat y lon son obligatorios',
            });
        }

        const forecast = await weatherService.getForecast(lat, lon);
        res.json({ pronostico: forecast });
    } catch (err) {
        console.error('Error obteniendo pronóstico:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener pronóstico' });
    }
};

module.exports = { getRange, getByDate, assign, remove, getWeather, getForecast };
