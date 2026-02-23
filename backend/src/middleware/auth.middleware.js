// Middleware de autenticación JWT
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// Verificar que el token JWT es válido
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: true,
            mensaje: 'Token de acceso no proporcionado',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: true,
                mensaje: 'Token expirado, usa el refresh token',
                code: 'TOKEN_EXPIRED',
            });
        }
        return res.status(403).json({
            error: true,
            mensaje: 'Token inválido',
        });
    }
};

module.exports = { verifyToken };
