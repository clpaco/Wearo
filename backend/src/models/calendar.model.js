// Modelo de Calendario — planificación de outfits por día
const { query } = require('../config/db');

// Asignar o actualizar un outfit para una fecha (upsert)
const upsert = async (userId, entryData) => {
    const { date, outfitId, notes, weatherTemp, weatherDesc, weatherIcon } = entryData;
    const result = await query(
        `INSERT INTO calendar_entries (user_id, date, outfit_id, notes, weather_temp, weather_desc, weather_icon)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, date)
     DO UPDATE SET
       outfit_id = COALESCE($3, calendar_entries.outfit_id),
       notes = COALESCE($4, calendar_entries.notes),
       weather_temp = COALESCE($5, calendar_entries.weather_temp),
       weather_desc = COALESCE($6, calendar_entries.weather_desc),
       weather_icon = COALESCE($7, calendar_entries.weather_icon)
     RETURNING *`,
        [userId, date, outfitId, notes, weatherTemp, weatherDesc, weatherIcon]
    );
    return result.rows[0];
};

// Obtener entradas por rango de fechas (vista mensual)
const findByRange = async (userId, startDate, endDate) => {
    const result = await query(
        `SELECT ce.*, o.name AS outfit_name,
      COALESCE(
        json_agg(
          json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url, 'category', g.category)
          ORDER BY og.position
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS garments
    FROM calendar_entries ce
    LEFT JOIN outfits o ON ce.outfit_id = o.id
    LEFT JOIN outfit_garments og ON o.id = og.outfit_id
    LEFT JOIN garments g ON og.garment_id = g.id
    WHERE ce.user_id = $1 AND ce.date >= $2 AND ce.date <= $3
    GROUP BY ce.id, o.name
    ORDER BY ce.date`,
        [userId, startDate, endDate]
    );
    return result.rows;
};

// Obtener una entrada específica por fecha
const findByDate = async (userId, date) => {
    const result = await query(
        `SELECT ce.*, o.name AS outfit_name,
      COALESCE(
        json_agg(
          json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url, 'category', g.category)
          ORDER BY og.position
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS garments
    FROM calendar_entries ce
    LEFT JOIN outfits o ON ce.outfit_id = o.id
    LEFT JOIN outfit_garments og ON o.id = og.outfit_id
    LEFT JOIN garments g ON og.garment_id = g.id
    WHERE ce.user_id = $1 AND ce.date = $2
    GROUP BY ce.id, o.name`,
        [userId, date]
    );
    return result.rows[0] || null;
};

// Eliminar una entrada
const remove = async (userId, date) => {
    const result = await query(
        'DELETE FROM calendar_entries WHERE user_id = $1 AND date = $2 RETURNING id',
        [userId, date]
    );
    return result.rows[0] || null;
};

module.exports = { upsert, findByRange, findByDate, remove };
