// Controlador de Autenticación
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findByEmail } = require('../models/user.model');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

// Generar tokens
const generateAccessToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
};

// POST /api/v1/auth/register
const register = async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        // Validaciones
        if (!email || !password || !fullName) {
            return res.status(400).json({
                error: true,
                mensaje: 'Email, contraseña y nombre completo son obligatorios',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: true,
                mensaje: 'La contraseña debe tener al menos 8 caracteres',
            });
        }

        // Verificar si el email ya existe
        const existingUser = await findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: true,
                mensaje: 'Ya existe una cuenta con ese email',
            });
        }

        // Hashear contraseña y crear usuario
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await createUser({ email, passwordHash, fullName });

        // Generar tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Guardar refresh token en BD
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
        await query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        );

        res.status(201).json({
            mensaje: 'Usuario registrado correctamente',
            usuario: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
            },
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({
            error: true,
            mensaje: 'Error interno al registrar el usuario',
        });
    }
};

// POST /api/v1/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: true,
                mensaje: 'Email y contraseña son obligatorios',
            });
        }

        // Buscar usuario
        const user = await findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: true,
                mensaje: 'Credenciales incorrectas',
            });
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                error: true,
                mensaje: 'Credenciales incorrectas',
            });
        }

        // Generar tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Guardar refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        );

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                avatarUrl: user.avatar_url,
            },
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({
            error: true,
            mensaje: 'Error interno al iniciar sesión',
        });
    }
};

// POST /api/v1/auth/refresh
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: true,
                mensaje: 'Refresh token es obligatorio',
            });
        }

        // Verificar que el token existe en BD
        const stored = await query(
            'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
            [token]
        );

        if (stored.rows.length === 0) {
            return res.status(403).json({
                error: true,
                mensaje: 'Refresh token inválido o expirado',
            });
        }

        // Verificar JWT
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

        // Generar nuevo access token
        const newAccessToken = generateAccessToken({ id: decoded.id, email: decoded.email });

        res.json({
            mensaje: 'Token refrescado correctamente',
            accessToken: newAccessToken,
        });
    } catch (err) {
        console.error('Error en refresh:', err);
        res.status(403).json({
            error: true,
            mensaje: 'Refresh token inválido',
        });
    }
};

// POST /api/v1/auth/logout
const logout = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            // Eliminar refresh token de la BD
            await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
        }

        res.json({ mensaje: 'Sesión cerrada correctamente' });
    } catch (err) {
        console.error('Error en logout:', err);
        res.status(500).json({
            error: true,
            mensaje: 'Error al cerrar sesión',
        });
    }
};

module.exports = { register, login, refreshToken, logout };
