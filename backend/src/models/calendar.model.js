// Modelo de Calendario — multi-entry por dia, outfits o prendas sueltas, auto-worn
const { query } = require('../config/db');

// Auto-migrations
query('ALTER TABLE calendar_entries ADD COLUMN IF NOT EXISTS worn BOOLEAN DEFAULT false')
    .catch(() => { /* ya existe */ });
query('ALTER TABLE calendar_entries ADD COLUMN IF NOT EXISTS garment_ids INTEGER[] DEFAULT \'{}\'')
    .catch(() => { /* ya existe */ });
// Permitir multiples entradas por usuario+fecha
query('ALTER TABLE calendar_entries DROP CONSTRAINT IF EXISTS calendar_entries_user_id_date_key')
    .catch(() => { /* constraint no existia */ });

// ── Insertar nueva entrada ──────────────────────────────────────────────────────
const insert = async (userId, entryData) => {
    const { date, outfitId, garmentIds, notes, worn } = entryData;
    const result = await query(
        `INSERT INTO calendar_entries (user_id, date, outfit_id, garment_ids, notes, worn)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, date, outfitId || null, garmentIds || [], notes || null, worn || false]
    );
    return result.rows[0];
};

// ── Obtener entradas por rango (vista mensual) ─────────────────────────────────
const findByRange = async (userId, startDate, endDate) => {
    const result = await query(
        `SELECT ce.*,
            o.name AS outfit_name,
            o.cover_image AS outfit_cover_image,
            CASE
                WHEN ce.outfit_id IS NOT NULL THEN
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url, 'category', g.category)
                            ORDER BY og.position
                        )
                        FROM outfit_garments og
                        JOIN garments g ON og.garment_id = g.id
                        WHERE og.outfit_id = ce.outfit_id),
                        '[]'::json
                    )
                WHEN array_length(ce.garment_ids, 1) > 0 THEN
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url, 'category', g.category)
                        )
                        FROM garments g
                        WHERE g.id = ANY(ce.garment_ids)),
                        '[]'::json
                    )
                ELSE '[]'::json
            END AS garments
        FROM calendar_entries ce
        LEFT JOIN outfits o ON ce.outfit_id = o.id
        WHERE ce.user_id = $1 AND ce.date >= $2 AND ce.date <= $3
        ORDER BY ce.date, ce.id`,
        [userId, startDate, endDate]
    );
    return result.rows;
};

// ── Obtener entradas de un dia (devuelve array) ─────────────────────────────────
const findByDate = async (userId, date) => {
    const result = await query(
        `SELECT ce.*,
            o.name AS outfit_name,
            o.cover_image AS outfit_cover_image,
            CASE
                WHEN ce.outfit_id IS NOT NULL THEN
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url, 'category', g.category)
                            ORDER BY og.position
                        )
                        FROM outfit_garments og
                        JOIN garments g ON og.garment_id = g.id
                        WHERE og.outfit_id = ce.outfit_id),
                        '[]'::json
                    )
                WHEN array_length(ce.garment_ids, 1) > 0 THEN
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object('id', g.id, 'name', g.name, 'image_url', g.image_url, 'category', g.category)
                        )
                        FROM garments g
                        WHERE g.id = ANY(ce.garment_ids)),
                        '[]'::json
                    )
                ELSE '[]'::json
            END AS garments
        FROM calendar_entries ce
        LEFT JOIN outfits o ON ce.outfit_id = o.id
        WHERE ce.user_id = $1 AND ce.date = $2
        ORDER BY ce.id`,
        [userId, date]
    );
    return result.rows;
};

// ── Buscar entrada por ID ───────────────────────────────────────────────────────
const findById = async (entryId, userId) => {
    const result = await query(
        'SELECT * FROM calendar_entries WHERE id = $1 AND user_id = $2',
        [entryId, userId]
    );
    return result.rows[0] || null;
};

// ── Eliminar entrada por ID ─────────────────────────────────────────────────────
const removeById = async (entryId, userId) => {
    const result = await query(
        'DELETE FROM calendar_entries WHERE id = $1 AND user_id = $2 RETURNING *',
        [entryId, userId]
    );
    return result.rows[0] || null;
};

module.exports = { insert, findByRange, findByDate, findById, removeById };
