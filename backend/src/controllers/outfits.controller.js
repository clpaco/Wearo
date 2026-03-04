// Controlador de Outfits — CRUD completo
const outfitModel = require('../models/outfit.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Directorio de uploads para cover images de outfits
const OUTFITS_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'outfits');
if (!fs.existsSync(OUTFITS_DIR)) fs.mkdirSync(OUTFITS_DIR, { recursive: true });

const outfitUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, OUTFITS_DIR),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
            cb(null, `outfit-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/v1/outfits — Listar outfits del usuario
const getAll = async (req, res) => {
    try {
        const filters = {
            occasion: req.query.occasion,
            season: req.query.season,
            isFavorite: req.query.favorite === 'true' ? true : undefined,
        };

        const outfits = await outfitModel.findAllByUser(req.user.id, filters);

        res.json({
            mensaje: 'Outfits obtenidos correctamente',
            total: outfits.length,
            outfits,
        });
    } catch (err) {
        console.error('Error obteniendo outfits:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener los outfits' });
    }
};

// GET /api/v1/outfits/:id — Detalle de un outfit
const getById = async (req, res) => {
    try {
        const outfit = await outfitModel.findById(req.user.id, req.params.id);
        if (!outfit) {
            return res.status(404).json({ error: true, mensaje: 'Outfit no encontrado' });
        }
        res.json({ outfit });
    } catch (err) {
        console.error('Error obteniendo outfit:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener el outfit' });
    }
};

// POST /api/v1/outfits — Crear nuevo outfit
const create = async (req, res) => {
    try {
        const { name, occasion, season, notes } = req.body;
        // garmentIds puede llegar como string (FormData) o array (JSON)
        let garmentIds = req.body.garmentIds;
        if (typeof garmentIds === 'string') {
            try { garmentIds = JSON.parse(garmentIds); } catch (_) { garmentIds = []; }
        }

        if (!name) {
            return res.status(400).json({ error: true, mensaje: 'El nombre es obligatorio' });
        }
        if (!garmentIds || garmentIds.length === 0) {
            return res.status(400).json({
                error: true,
                mensaje: 'Selecciona al menos una prenda para el outfit',
            });
        }

        const coverImage = req.file ? `/uploads/outfits/${req.file.filename}` : null;

        const outfit = await outfitModel.create(req.user.id, {
            name, occasion, season, notes, garmentIds, coverImage,
        });

        res.status(201).json({
            mensaje: 'Outfit creado correctamente',
            outfit,
        });
    } catch (err) {
        console.error('Error creando outfit:', err);
        res.status(500).json({ error: true, mensaje: 'Error al crear el outfit' });
    }
};

// PUT /api/v1/outfits/:id — Actualizar outfit
const update = async (req, res) => {
    try {
        const { name, occasion, season, notes, isFavorite } = req.body;
        let garmentIds = req.body.garmentIds;
        if (typeof garmentIds === 'string') {
            try { garmentIds = JSON.parse(garmentIds); } catch (_) { garmentIds = undefined; }
        }

        let coverImage;
        if (req.file) {
            coverImage = `/uploads/outfits/${req.file.filename}`;
            // Borrar imagen anterior si existe
            const existing = await outfitModel.findById(req.user.id, req.params.id);
            if (existing?.cover_image) {
                const oldPath = path.resolve(__dirname, '..', '..', existing.cover_image.replace(/^\//, ''));
                fs.unlink(oldPath, () => {});
            }
        }

        const outfit = await outfitModel.update(req.user.id, req.params.id, {
            name, occasion, season, notes, isFavorite, garmentIds, coverImage,
        });

        if (!outfit) {
            return res.status(404).json({ error: true, mensaje: 'Outfit no encontrado' });
        }

        res.json({ mensaje: 'Outfit actualizado correctamente', outfit });
    } catch (err) {
        console.error('Error actualizando outfit:', err);
        res.status(500).json({ error: true, mensaje: 'Error al actualizar el outfit' });
    }
};

// DELETE /api/v1/outfits/:id — Eliminar outfit
const remove = async (req, res) => {
    try {
        // Borrar cover image del disco si existe
        const existing = await outfitModel.findById(req.user.id, req.params.id);
        if (existing?.cover_image) {
            const imgPath = path.resolve(__dirname, '..', '..', existing.cover_image.replace(/^\//, ''));
            fs.unlink(imgPath, () => {});
        }

        const outfit = await outfitModel.remove(req.user.id, req.params.id);
        if (!outfit) {
            return res.status(404).json({ error: true, mensaje: 'Outfit no encontrado' });
        }
        res.json({ mensaje: 'Outfit eliminado correctamente' });
    } catch (err) {
        console.error('Error eliminando outfit:', err);
        res.status(500).json({ error: true, mensaje: 'Error al eliminar el outfit' });
    }
};

module.exports = { getAll, getById, create, update, remove, outfitUpload };
