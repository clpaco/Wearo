// Modelo de Outfit — operaciones CRUD con relación many-to-many a prendas
const { query, pool } = require('../config/db');

// Auto-migration: añadir columna cover_image si no existe
(async () => {
    try {
        await query(`ALTER TABLE outfits ADD COLUMN IF NOT EXISTS cover_image VARCHAR(255)`);
    } catch (_) {}
})();

// Crear un outfit con sus prendas
const create = async (userId, outfitData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { name, occasion, season, notes, garmentIds, coverImage } = outfitData;

        // Insertar outfit
        const outfitResult = await client.query(
            `INSERT INTO outfits (user_id, name, occasion, season, notes, cover_image)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, name, occasion, season, notes, coverImage || null]
        );
        const outfit = outfitResult.rows[0];

        // Insertar relaciones con prendas
        if (garmentIds && garmentIds.length > 0) {
            for (let i = 0; i < garmentIds.length; i++) {
                await client.query(
                    'INSERT INTO outfit_garments (outfit_id, garment_id, position) VALUES ($1, $2, $3)',
                    [outfit.id, garmentIds[i], i]
                );
            }
        }

        await client.query('COMMIT');

        // Devolver outfit con sus prendas
        return await findById(userId, outfit.id);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// Obtener todos los outfits del usuario con sus prendas
const findAllByUser = async (userId, filters = {}) => {
    let sql = `
    SELECT o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', g.id, 'name', g.name, 'category', g.category,
            'color', g.color, 'image_url', g.image_url
          ) ORDER BY og.position
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS garments,
      (SELECT MAX(ce.date) FROM calendar_entries ce WHERE ce.user_id = o.user_id AND ce.outfit_id = o.id) AS last_worn
    FROM outfits o
    LEFT JOIN outfit_garments og ON o.id = og.outfit_id
    LEFT JOIN garments g ON og.garment_id = g.id
    WHERE o.user_id = $1`;

    const params = [userId];
    let paramIdx = 2;

    if (filters.occasion) {
        sql += ` AND o.occasion = $${paramIdx++}`;
        params.push(filters.occasion);
    }
    if (filters.season) {
        sql += ` AND o.season = $${paramIdx++}`;
        params.push(filters.season);
    }
    if (filters.isFavorite !== undefined) {
        sql += ` AND o.is_favorite = $${paramIdx++}`;
        params.push(filters.isFavorite);
    }

    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const result = await query(sql, params);
    return result.rows;
};

// Obtener un outfit por ID con sus prendas
const findById = async (userId, outfitId) => {
    const result = await query(
        `SELECT o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', g.id, 'name', g.name, 'category', g.category,
            'color', g.color, 'brand', g.brand, 'image_url', g.image_url
          ) ORDER BY og.position
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS garments
    FROM outfits o
    LEFT JOIN outfit_garments og ON o.id = og.outfit_id
    LEFT JOIN garments g ON og.garment_id = g.id
    WHERE o.id = $1 AND o.user_id = $2
    GROUP BY o.id`,
        [outfitId, userId]
    );
    return result.rows[0] || null;
};

// Actualizar un outfit
const update = async (userId, outfitId, outfitData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { name, occasion, season, notes, isFavorite, garmentIds, coverImage } = outfitData;

        await client.query(
            `UPDATE outfits SET
        name = COALESCE($3, name),
        occasion = COALESCE($4, occasion),
        season = COALESCE($5, season),
        notes = COALESCE($6, notes),
        is_favorite = COALESCE($7, is_favorite),
        cover_image = COALESCE($8, cover_image),
        updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
            [outfitId, userId, name, occasion, season, notes, isFavorite, coverImage]
        );

        // Reemplazar prendas si se enviaron
        if (garmentIds !== undefined) {
            await client.query('DELETE FROM outfit_garments WHERE outfit_id = $1', [outfitId]);
            for (let i = 0; i < garmentIds.length; i++) {
                await client.query(
                    'INSERT INTO outfit_garments (outfit_id, garment_id, position) VALUES ($1, $2, $3)',
                    [outfitId, garmentIds[i], i]
                );
            }
        }

        await client.query('COMMIT');
        return await findById(userId, outfitId);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// Eliminar un outfit
const remove = async (userId, outfitId) => {
    const result = await query(
        'DELETE FROM outfits WHERE id = $1 AND user_id = $2 RETURNING id',
        [outfitId, userId]
    );
    return result.rows[0] || null;
};

// Incrementar veces usado
const incrementWorn = async (userId, outfitId) => {
    const result = await query(
        `UPDATE outfits SET times_worn = times_worn + 1, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
        [outfitId, userId]
    );
    return result.rows[0] || null;
};

module.exports = { create, findAllByUser, findById, update, remove, incrementWorn };
