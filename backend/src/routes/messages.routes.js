// Rutas de Mensajes Directos
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getConversations, getUnreadCount, searchUsersForChat, startConversation,
    getMessages, sendMessage, markRead, msgUpload,
} = require('../controllers/messages.controller');

router.use(verifyToken);

// GET /api/v1/messages — Listar conversaciones
router.get('/', getConversations);

// GET /api/v1/messages/unread — Total no leídos
router.get('/unread', getUnreadCount);

// GET /api/v1/messages/search?q= — Buscar usuarios para chat
router.get('/search', searchUsersForChat);

// POST /api/v1/messages/conversation — Crear/obtener conversación
router.post('/conversation', startConversation);

// GET /api/v1/messages/:conversationId — Mensajes de una conversación
router.get('/:conversationId', getMessages);

// POST /api/v1/messages/:conversationId — Enviar mensaje (con media opcional)
router.post('/:conversationId', msgUpload.single('media'), sendMessage);

// PUT /api/v1/messages/:conversationId/read — Marcar como leídos
router.put('/:conversationId/read', markRead);

module.exports = router;
