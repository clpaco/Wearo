// Modelo de Usuario — operaciones de base de datos
const { query } = require('../config/db');

// Crear un nuevo usuario
const createUser = async ({ email, passwordHash, fullName }) => {
    const result = await query(
        `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, full_name, avatar_url, created_at`,
        [email, passwordHash, fullName]
    );
    return result.rows[0];
};

// Buscar usuario por email
const findByEmail = async (email) => {
    const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    return result.rows[0] || null;
};

// Buscar usuario por ID (sin devolver password_hash)
const findById = async (id) => {
    const result = await query(
        'SELECT id, email, full_name, avatar_url, created_at, updated_at FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

// Actualizar perfil de usuario
const updateUser = async (id, { fullName, avatarUrl }) => {
    const result = await query(
        `UPDATE users SET full_name = COALESCE($2, full_name),
                      avatar_url = COALESCE($3, avatar_url),
                      updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, full_name, avatar_url, updated_at`,
        [id, fullName, avatarUrl]
    );
    return result.rows[0];
};

module.exports = { createUser, findByEmail, findById, updateUser };
