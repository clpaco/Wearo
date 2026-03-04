// Rutas de soporte — crear ticket (usuario autenticado)
const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const supportCtrl = require('../controllers/support.controller');

// Cualquier usuario autenticado puede enviar un ticket
router.post('/', verifyToken, supportCtrl.submitTicket);

module.exports = router;
