// Controlador IA — Gemini (outfits/clima) + Perplexity (compras)
const aiService     = require('../services/ai.service');
const garmentModel  = require('../models/garment.model');
const outfitModel   = require('../models/outfit.model');
const weatherService = require('../services/weather.service');

// POST /api/v1/ai/weather-recommend — Sugerencia de outfit según clima
const weatherRecommend = async (req, res) => {
    try {
        const { city } = req.body;
        if (!city) return res.status(400).json({ error: true, mensaje: 'Se requiere el parámetro city' });

        const [garments, outfitsRaw, weather] = await Promise.all([
            garmentModel.findAllByUser(req.user.id),
            outfitModel.findAllByUser(req.user.id),
            weatherService.getWeatherByCity(city),
        ]);

        if (!weather) return res.status(503).json({ error: true, mensaje: 'No se pudo obtener el clima' });

        // Normalizar garments de outfits (pueden venir como string JSON)
        const outfits = outfitsRaw.map((o) => ({
            ...o,
            garments: typeof o.garments === 'string' ? JSON.parse(o.garments) : (o.garments || []),
        }));

        const recommendation = await aiService.recommendByWeather({ weather, garments, outfits });
        res.json({ recommendation, weather });
    } catch (err) {
        console.error('Error IA weather-recommend:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener recomendación' });
    }
};

// POST /api/v1/ai/chat — Chat sobre armario con Gemini
const chat = async (req, res) => {
    try {
        const { messages, city } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: true, mensaje: 'Se requiere el array messages' });
        }

        const [garments, outfitsRaw] = await Promise.all([
            garmentModel.findAllByUser(req.user.id),
            outfitModel.findAllByUser(req.user.id),
        ]);

        const outfits = outfitsRaw.map((o) => ({
            ...o,
            garments: typeof o.garments === 'string' ? JSON.parse(o.garments) : (o.garments || []),
        }));

        // Obtener clima opcionalmente
        let weather = null;
        if (city) {
            weather = await weatherService.getWeatherByCity(city).catch(() => null);
        }

        const reply = await aiService.chatAboutWardrobe({ messages, garments, outfits, weather });
        res.json({ reply });
    } catch (err) {
        console.error('Error IA chat:', err);
        res.status(500).json({ error: true, mensaje: 'Error en el chat de IA' });
    }
};

// POST /api/v1/ai/shopping — Recomendaciones de compra con Perplexity
const shopping = async (req, res) => {
    try {
        const garments = await garmentModel.findAllByUser(req.user.id);
        const recommendations = await aiService.recommendPurchases({ garments });
        res.json({ recommendations });
    } catch (err) {
        console.error('Error IA shopping:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener sugerencias de compra' });
    }
};

module.exports = { weatherRecommend, chat, shopping };
