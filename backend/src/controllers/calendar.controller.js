// Controlador de Calendario — multi-entry, auto-worn, solo hoy editable
const calendarModel = require('../models/calendar.model');
const outfitModel = require('../models/outfit.model');
const garmentModel = require('../models/garment.model');
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

// GET /api/v1/calendar/:date — Entradas de un día (devuelve array)
const getByDate = async (req, res) => {
    try {
        const entries = await calendarModel.findByDate(req.user.id, req.params.date);
        res.json({ entradas: entries });
    } catch (err) {
        console.error('Error obteniendo entradas:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener las entradas' });
    }
};

// POST /api/v1/calendar — Añadir entrada (outfit o prendas sueltas) solo para hoy
const assign = async (req, res) => {
    try {
        const { date, outfitId, garmentIds, notes } = req.body;
        if (!date) {
            return res.status(400).json({ error: true, mensaje: 'La fecha es obligatoria' });
        }

        // Solo permitir entradas para hoy
        const today = new Date().toISOString().split('T')[0];
        if (date !== today) {
            return res.status(400).json({ error: true, mensaje: 'Solo puedes añadir entradas para hoy' });
        }

        if (!outfitId && (!garmentIds || garmentIds.length === 0)) {
            return res.status(400).json({ error: true, mensaje: 'Selecciona un outfit o al menos una prenda' });
        }

        // Insertar con worn = true (auto-worn para hoy)
        const entry = await calendarModel.insert(req.user.id, {
            date, outfitId, garmentIds, notes, worn: true,
        });

        // Auto-incrementar contadores de uso
        if (outfitId) {
            await outfitModel.incrementWorn(req.user.id, outfitId);
            const outfit = await outfitModel.findById(req.user.id, outfitId);
            if (outfit && Array.isArray(outfit.garments)) {
                for (const g of outfit.garments) {
                    if (g.id) await garmentModel.incrementWorn(req.user.id, g.id);
                }
            }
        }
        if (garmentIds && garmentIds.length > 0) {
            for (const gId of garmentIds) {
                await garmentModel.incrementWorn(req.user.id, gId);
            }
        }

        // Re-fetch the enriched entry with garments data
        const enrichedEntries = await calendarModel.findByDate(req.user.id, date);
        const enrichedEntry = enrichedEntries.find(e => e.id === entry.id) || entry;

        res.status(201).json({ mensaje: 'Entrada añadida al calendario', entrada: enrichedEntry });
    } catch (err) {
        console.error('Error asignando entrada:', err);
        res.status(500).json({ error: true, mensaje: 'Error al asignar entrada' });
    }
};

// DELETE /api/v1/calendar/entry/:id — Eliminar entrada (solo hoy)
const removeEntry = async (req, res) => {
    try {
        const entryId = req.params.id;
        const userId = req.user.id;

        const entry = await calendarModel.findById(entryId, userId);
        if (!entry) {
            return res.status(404).json({ error: true, mensaje: 'Entrada no encontrada' });
        }

        // Solo permitir eliminar entradas de hoy
        const today = new Date().toISOString().split('T')[0];
        const entryDate = typeof entry.date === 'string' ? entry.date.split('T')[0] : String(entry.date);
        if (entryDate !== today) {
            return res.status(400).json({ error: true, mensaje: 'Solo puedes eliminar entradas de hoy' });
        }

        await calendarModel.removeById(entryId, userId);
        res.json({ mensaje: 'Entrada eliminada del calendario', entryId: Number(entryId) });
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

module.exports = { getRange, getByDate, assign, removeEntry, getWeather, getForecast };
