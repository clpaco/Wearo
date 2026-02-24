// Modelo de Estadísticas — queries de agregación sobre prendas, outfits y calendario
const { query } = require('../config/db');

// Resumen general del usuario
const getOverview = async (userId) => {
    const result = await query(
        `SELECT
      (SELECT COUNT(*) FROM garments WHERE user_id = $1) AS total_prendas,
      (SELECT COUNT(*) FROM garments WHERE user_id = $1 AND is_favorite = true) AS prendas_favoritas,
      (SELECT COUNT(*) FROM outfits WHERE user_id = $1) AS total_outfits,
      (SELECT COUNT(*) FROM outfits WHERE user_id = $1 AND is_favorite = true) AS favorite_outfits,
      (SELECT COUNT(*) FROM calendar_entries WHERE user_id = $1) AS outfits_planificados,
      (SELECT COUNT(DISTINCT category) FROM garments WHERE user_id = $1) AS unique_categories`,
        [userId]
    );
    return result.rows[0];
};

// Prendas agrupadas por categoría
const garmentsByCategory = async (userId) => {
    const result = await query(
        `SELECT category AS label, COUNT(*)::int AS value
     FROM garments WHERE user_id = $1
     GROUP BY category ORDER BY value DESC`,
        [userId]
    );
    return result.rows;
};

// Prendas agrupadas por color
const garmentsByColor = async (userId) => {
    const result = await query(
        `SELECT COALESCE(color, 'Sin color') AS label, COUNT(*)::int AS value
     FROM garments WHERE user_id = $1
     GROUP BY color ORDER BY value DESC`,
        [userId]
    );
    return result.rows;
};

// Prendas agrupadas por temporada
const garmentsBySeason = async (userId) => {
    const result = await query(
        `SELECT COALESCE(season, 'Sin temporada') AS label, COUNT(*)::int AS value
     FROM garments WHERE user_id = $1
     GROUP BY season ORDER BY value DESC`,
        [userId]
    );
    return result.rows;
};

// Top outfits más planificados en el calendario
const topPlannedOutfits = async (userId, limit = 5) => {
    const result = await query(
        `SELECT o.name AS label, COUNT(ce.id)::int AS value
     FROM calendar_entries ce
     JOIN outfits o ON ce.outfit_id = o.id
     WHERE ce.user_id = $1 AND ce.outfit_id IS NOT NULL
     GROUP BY o.id, o.name
     ORDER BY value DESC
     LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
};

// Actividad del calendario por mes (últimos 6 meses)
const monthlyActivity = async (userId) => {
    const result = await query(
        `SELECT
       TO_CHAR(date, 'YYYY-MM') AS month,
       TO_CHAR(date, 'Mon') AS label,
       COUNT(*)::int AS value
     FROM calendar_entries
     WHERE user_id = $1
       AND date >= (CURRENT_DATE - INTERVAL '5 months')
     GROUP BY month, label
     ORDER BY month`,
        [userId]
    );
    return result.rows;
};

// Prendas más usadas en outfits (aparecen en más combinaciones)
const mostUsedGarments = async (userId, limit = 5) => {
    const result = await query(
        `SELECT g.name AS label, COUNT(og.id)::int AS value
     FROM outfit_garments og
     JOIN garments g ON og.garment_id = g.id
     WHERE g.user_id = $1
     GROUP BY g.id, g.name
     ORDER BY value DESC
     LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
};

module.exports = {
    getOverview,
    garmentsByCategory,
    garmentsByColor,
    garmentsBySeason,
    topPlannedOutfits,
    monthlyActivity,
    mostUsedGarments,
};
