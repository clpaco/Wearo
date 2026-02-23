// Controlador de Estadísticas — devuelve datos agregados para gráficos
const statsModel = require('../models/stats.model');

// GET /api/v1/stats/overview — Resumen general
const getOverview = async (req, res) => {
    try {
        const overview = await statsModel.getOverview(req.user.id);
        res.json({ resumen: overview });
    } catch (err) {
        console.error('Error obteniendo resumen:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener resumen' });
    }
};

// GET /api/v1/stats/categories — Prendas por categoría
const getByCategory = async (req, res) => {
    try {
        const data = await statsModel.garmentsByCategory(req.user.id);
        res.json({ datos: data });
    } catch (err) {
        console.error('Error obteniendo categorías:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener categorías' });
    }
};

// GET /api/v1/stats/colors — Prendas por color
const getByColor = async (req, res) => {
    try {
        const data = await statsModel.garmentsByColor(req.user.id);
        res.json({ datos: data });
    } catch (err) {
        console.error('Error obteniendo colores:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener colores' });
    }
};

// GET /api/v1/stats/seasons — Prendas por temporada
const getBySeason = async (req, res) => {
    try {
        const data = await statsModel.garmentsBySeason(req.user.id);
        res.json({ datos: data });
    } catch (err) {
        console.error('Error obteniendo temporadas:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener temporadas' });
    }
};

// GET /api/v1/stats/top-outfits — Outfits más planificados
const getTopOutfits = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 5;
        const data = await statsModel.topPlannedOutfits(req.user.id, limit);
        res.json({ datos: data });
    } catch (err) {
        console.error('Error obteniendo top outfits:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener top outfits' });
    }
};

// GET /api/v1/stats/activity — Actividad mensual del calendario
const getActivity = async (req, res) => {
    try {
        const data = await statsModel.monthlyActivity(req.user.id);
        res.json({ datos: data });
    } catch (err) {
        console.error('Error obteniendo actividad:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener actividad' });
    }
};

// GET /api/v1/stats/top-garments — Prendas más usadas en outfits
const getTopGarments = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 5;
        const data = await statsModel.mostUsedGarments(req.user.id, limit);
        res.json({ datos: data });
    } catch (err) {
        console.error('Error obteniendo prendas top:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener prendas top' });
    }
};

// GET /api/v1/stats — Todas las estadísticas en una sola llamada
const getAll = async (req, res) => {
    try {
        const [overview, categories, colors, seasons, topOutfits, activity, topGarments] =
            await Promise.all([
                statsModel.getOverview(req.user.id),
                statsModel.garmentsByCategory(req.user.id),
                statsModel.garmentsByColor(req.user.id),
                statsModel.garmentsBySeason(req.user.id),
                statsModel.topPlannedOutfits(req.user.id),
                statsModel.monthlyActivity(req.user.id),
                statsModel.mostUsedGarments(req.user.id),
            ]);

        res.json({
            resumen: overview,
            categorias: categories,
            colores: colors,
            temporadas: seasons,
            topOutfits,
            actividad: activity,
            topPrendas: topGarments,
        });
    } catch (err) {
        console.error('Error obteniendo estadísticas:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener estadísticas' });
    }
};

module.exports = {
    getOverview,
    getByCategory,
    getByColor,
    getBySeason,
    getTopOutfits,
    getActivity,
    getTopGarments,
    getAll,
};
