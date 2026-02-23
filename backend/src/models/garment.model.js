// Modelo de Prenda — operaciones CRUD de base de datos
const { query } = require('../config/db');

// Crear una nueva prenda
const create = async (userId, garmentData) => {
    const { name, category, color, brand, season, imageUrl, notes } = garmentData;
    const result = await query(
        `INSERT INTO garments (user_id, name, category, color, brand, season, image_url, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
        [userId, name, category, color, brand, season, imageUrl, notes]
    );
    return result.rows[0];
};

// Obtener todas las prendas de un usuario (con filtros opcionales)
const findAllByUser = async (userId, filters = {}) => {
    let sql = 'SELECT * FROM garments WHERE user_id = $1';
    const params = [userId];
    let paramIdx = 2;

    if (filters.category) {
        sql += ` AND category = $${paramIdx++}`;
        params.push(filters.category);
    }
    if (filters.color) {
        sql += ` AND color = $${paramIdx++}`;
        params.push(filters.color);
    }
    if (filters.season) {
        sql += ` AND season = $${paramIdx++}`;
        params.push(filters.season);
    }
    if (filters.isFavorite !== undefined) {
        sql += ` AND is_favorite = $${paramIdx++}`;
        params.push(filters.isFavorite);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.rows;
};

// Obtener una prenda por ID (verificando que pertenece al usuario)
const findById = async (userId, garmentId) => {
    const result = await query(
        'SELECT * FROM garments WHERE id = $1 AND user_id = $2',
        [garmentId, userId]
    );
    return result.rows[0] || null;
};

// Actualizar una prenda
const update = async (userId, garmentId, garmentData) => {
    const { name, category, color, brand, season, imageUrl, notes, isFavorite } = garmentData;
    const result = await query(
        `UPDATE garments SET
      name = COALESCE($3, name),
      category = COALESCE($4, category),
      color = COALESCE($5, color),
      brand = COALESCE($6, brand),
      season = COALESCE($7, season),
      image_url = COALESCE($8, image_url),
      notes = COALESCE($9, notes),
      is_favorite = COALESCE($10, is_favorite),
      updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
        [garmentId, userId, name, category, color, brand, season, imageUrl, notes, isFavorite]
    );
    return result.rows[0] || null;
};

// Eliminar una prenda
const remove = async (userId, garmentId) => {
    const result = await query(
        'DELETE FROM garments WHERE id = $1 AND user_id = $2 RETURNING id',
        [garmentId, userId]
    );
    return result.rows[0] || null;
};

// Incrementar contador de veces usada
const incrementWorn = async (userId, garmentId) => {
    const result = await query(
        `UPDATE garments SET times_worn = times_worn + 1, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
        [garmentId, userId]
    );
    return result.rows[0] || null;
};

// Obtener categorías únicas del usuario
const getCategories = async (userId) => {
    const result = await query(
        'SELECT DISTINCT category FROM garments WHERE user_id = $1 ORDER BY category',
        [userId]
    );
    return result.rows.map((r) => r.category);
};

module.exports = { create, findAllByUser, findById, update, remove, incrementWorn, getCategories };
