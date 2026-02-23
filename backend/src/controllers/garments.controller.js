// Controlador de Prendas — CRUD completo
const garmentModel = require('../models/garment.model');
const fs = require('fs');
const path = require('path');

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

module.exports = { getAll, getById, create, update, remove, getCategories };
