// Controlador de Prendas — CRUD completo
const garmentModel = require('../models/garment.model');
const fs = require('fs');
const path = require('path');
const ColorThief = require('colorthief');

// ── Colores predefinidos con sus valores RGB para deteccion ─────────────────
const PREDEFINED_COLORS = [
    { name: 'negro', rgb: [0, 0, 0] },
    { name: 'blanco', rgb: [255, 255, 255] },
    { name: 'gris', rgb: [128, 128, 128] },
    { name: 'gris claro', rgb: [192, 192, 192] },
    { name: 'rojo', rgb: [220, 53, 69] },
    { name: 'azul', rgb: [0, 123, 255] },
    { name: 'azul marino', rgb: [0, 0, 128] },
    { name: 'azul claro', rgb: [135, 206, 235] },
    { name: 'verde', rgb: [40, 167, 69] },
    { name: 'verde oliva', rgb: [128, 128, 0] },
    { name: 'amarillo', rgb: [255, 193, 7] },
    { name: 'rosa', rgb: [232, 62, 140] },
    { name: 'morado', rgb: [111, 66, 193] },
    { name: 'marron', rgb: [121, 85, 72] },
    { name: 'beige', rgb: [245, 245, 220] },
    { name: 'naranja', rgb: [253, 126, 20] },
    { name: 'coral', rgb: [255, 127, 80] },
    { name: 'turquesa', rgb: [0, 206, 209] },
];

const colorDistance = (a, b) =>
    Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

const findClosestColor = (rgb) => {
    let closest = PREDEFINED_COLORS[0];
    let minDist = Infinity;
    for (const c of PREDEFINED_COLORS) {
        const d = colorDistance(rgb, c.rgb);
        if (d < minDist) {
            minDist = d;
            closest = c;
        }
    }
    return closest.name;
};

// GET /api/v1/garments — Listar prendas del usuario
const getAll = async (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            color: req.query.color,
            season: req.query.season,
            isFavorite: req.query.favorite === 'true' ? true : undefined,
        };

        const garments = await garmentModel.findAllByUser(req.user.id, filters);

        res.json({
            mensaje: 'Prendas obtenidas correctamente',
            total: garments.length,
            prendas: garments,
        });
    } catch (err) {
        console.error('Error obteniendo prendas:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener las prendas' });
    }
};

// GET /api/v1/garments/:id — Detalle de una prenda
const getById = async (req, res) => {
    try {
        const garment = await garmentModel.findById(req.user.id, req.params.id);
        if (!garment) {
            return res.status(404).json({ error: true, mensaje: 'Prenda no encontrada' });
        }
        res.json({ prenda: garment });
    } catch (err) {
        console.error('Error obteniendo prenda:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener la prenda' });
    }
};

// POST /api/v1/garments — Crear nueva prenda
const create = async (req, res) => {
    try {
        const { name, category, color, brand, season, notes } = req.body;

        if (!name || !category) {
            return res.status(400).json({
                error: true,
                mensaje: 'Nombre y categoría son obligatorios',
            });
        }

        // URL de la imagen si se subió
        const imageUrl = req.file
            ? `/uploads/garments/${req.file.filename}`
            : null;

        const garment = await garmentModel.create(req.user.id, {
            name, category, color, brand, season, imageUrl, notes,
        });

        res.status(201).json({
            mensaje: 'Prenda añadida correctamente',
            prenda: garment,
        });
    } catch (err) {
        console.error('Error creando prenda:', err);
        res.status(500).json({ error: true, mensaje: 'Error al crear la prenda' });
    }
};

// PUT /api/v1/garments/:id — Actualizar prenda
const update = async (req, res) => {
    try {
        const { name, category, color, brand, season, notes, isFavorite } = req.body;

        const imageUrl = req.file
            ? `/uploads/garments/${req.file.filename}`
            : undefined;

        const garment = await garmentModel.update(req.user.id, req.params.id, {
            name, category, color, brand, season, imageUrl, notes, isFavorite,
        });

        if (!garment) {
            return res.status(404).json({ error: true, mensaje: 'Prenda no encontrada' });
        }

        res.json({ mensaje: 'Prenda actualizada correctamente', prenda: garment });
    } catch (err) {
        console.error('Error actualizando prenda:', err);
        res.status(500).json({ error: true, mensaje: 'Error al actualizar la prenda' });
    }
};

// DELETE /api/v1/garments/:id — Eliminar prenda
const remove = async (req, res) => {
    try {
        // Obtener prenda para borrar imagen
        const garment = await garmentModel.findById(req.user.id, req.params.id);
        if (!garment) {
            return res.status(404).json({ error: true, mensaje: 'Prenda no encontrada' });
        }

        // Borrar imagen del disco si existe
        if (garment.image_url) {
            const imgPath = path.resolve(__dirname, '..', '..', garment.image_url);
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        }

        await garmentModel.remove(req.user.id, req.params.id);
        res.json({ mensaje: 'Prenda eliminada correctamente' });
    } catch (err) {
        console.error('Error eliminando prenda:', err);
        res.status(500).json({ error: true, mensaje: 'Error al eliminar la prenda' });
    }
};

// GET /api/v1/garments/categories — Categorías del usuario
const getCategories = async (req, res) => {
    try {
        const categories = await garmentModel.getCategories(req.user.id);
        res.json({ categorias: categories });
    } catch (err) {
        console.error('Error obteniendo categorías:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener categorías' });
    }
};

// POST /api/v1/garments/detect-color — Detectar color dominante de imagen
const detectColor = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: true, mensaje: 'Se requiere una imagen' });
        }

        const imgPath = path.resolve(req.file.path);
        const dominantColor = await ColorThief.getColor(imgPath);

        // Borrar imagen temporal
        try { fs.unlinkSync(imgPath); } catch (_) { /* ignore */ }

        const suggestedColor = findClosestColor(dominantColor);

        res.json({
            suggestedColor,
            dominantRgb: dominantColor,
            allColors: PREDEFINED_COLORS.map((c) => c.name),
        });
    } catch (err) {
        // Limpiar archivo si existe
        if (req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
        }
        console.error('Error detectando color:', err);
        res.status(500).json({ error: true, mensaje: 'Error al detectar el color' });
    }
};

module.exports = { getAll, getById, create, update, remove, getCategories, detectColor };
