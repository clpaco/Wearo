// Middleware de verificacion de admin
const { query } = require('../config/db');

const isAdmin = async (req, res, next) => {
    try {
        const result = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({
                error: true,
                mensaje: 'Acceso denegado. Se requieren permisos de administrador.',
            });
        }
        next();
    } catch (err) {
        console.error('Error en isAdmin:', err);
        res.status(500).json({ error: true, mensaje: 'Error verificando permisos' });
    }
};

module.exports = { isAdmin };
