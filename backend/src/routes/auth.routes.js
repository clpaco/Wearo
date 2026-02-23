// Rutas de autenticación
const express = require('express');
const router = express.Router();
const {
    register,
    login,
    refreshToken,
    logout,
} = require('../controllers/auth.controller');

// POST /api/v1/auth/register — Registrar nuevo usuario
router.post('/register', register);

// POST /api/v1/auth/login — Iniciar sesión
router.post('/login', login);

// POST /api/v1/auth/refresh — Refrescar access token
router.post('/refresh', refreshToken);

// POST /api/v1/auth/logout — Cerrar sesión
router.post('/logout', logout);

module.exports = router;
