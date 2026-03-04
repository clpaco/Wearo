// Controlador IA — Gemini (outfits/clima) + Perplexity (compras) + Whisper (transcripcion)
const aiService     = require('../services/ai.service');
const garmentModel  = require('../models/garment.model');
const outfitModel   = require('../models/outfit.model');
const weatherService = require('../services/weather.service');
const { query: dbQuery } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer para audio temporal (transcripcion)
const TEMP_DIR = path.join(__dirname, '..', '..', 'uploads', 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
const audioUpload = multer({
    storage: multer.diskStorage({
        destination: (_, __, cb) => cb(null, TEMP_DIR),
        filename: (_, file, cb) => cb(null, `voice-${Date.now()}${path.extname(file.originalname) || '.m4a'}`),
    }),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max (limite Whisper)
});

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
        const { query } = req.body || {};
        const [garments, userRow] = await Promise.all([
            garmentModel.findAllByUser(req.user.id),
            dbQuery('SELECT gender FROM users WHERE id = $1', [req.user.id]).then(r => r.rows[0]),
        ]);
        const gender = userRow?.gender || '';
        const recommendations = await aiService.recommendPurchases({ garments, query: query || '', gender });
        res.json({ recommendations });
    } catch (err) {
        console.error('Error IA shopping:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener sugerencias de compra' });
    }
};

// POST /api/v1/ai/transcribe — Transcribir audio a texto (Whisper via Groq)
const transcribe = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: true, mensaje: 'Se requiere un archivo de audio' });
        }
        const text = await aiService.transcribeAudio(req.file.path);
        // Borrar archivo temporal
        fs.unlink(req.file.path, () => {});
        res.json({ text });
    } catch (err) {
        // Borrar archivo temporal en caso de error
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        console.error('Error transcripcion:', err.response?.data || err.message);
        res.status(500).json({ error: true, mensaje: 'Error al transcribir audio' });
    }
};

module.exports = { weatherRecommend, chat, shopping, transcribe, audioUpload };
