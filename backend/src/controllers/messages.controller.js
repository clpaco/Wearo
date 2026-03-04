// Controlador de Mensajes Directos
const messagesModel = require('../models/messages.model');
const socialModel = require('../models/social.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer para fotos en mensajes
const MSG_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'messages');
if (!fs.existsSync(MSG_DIR)) fs.mkdirSync(MSG_DIR, { recursive: true });

const msgUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, MSG_DIR),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `msg-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    fileFilter: (_req, file, cb) => {
        const ok = [
            'image/jpeg', 'image/png', 'image/webp', 'image/heic',
            'audio/mp4', 'audio/mpeg', 'audio/m4a', 'audio/aac',
            'audio/x-m4a', 'audio/mp4a-latm', 'audio/x-caf', 'audio/wav',
            'audio/webm', 'audio/ogg', 'audio/3gpp',
        ].includes(file.mimetype);
        cb(ok ? null : new Error('Tipo no permitido'), ok);
    },
    limits: { fileSize: 15 * 1024 * 1024 },
});

// GET /api/v1/messages — Listar conversaciones del usuario
const getConversations = async (req, res) => {
    try {
        const conversations = await messagesModel.getConversations(req.user.id);
        res.json({ conversations });
    } catch (err) {
        console.error('Error obteniendo conversaciones:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener conversaciones' });
    }
};

// GET /api/v1/messages/unread — Total de mensajes no leídos
const getUnreadCount = async (req, res) => {
    try {
        const count = await messagesModel.getUnreadTotal(req.user.id);
        res.json({ unreadCount: count });
    } catch (err) {
        console.error('Error contando no leídos:', err);
        res.status(500).json({ error: true, mensaje: 'Error al contar mensajes' });
    }
};

// GET /api/v1/messages/search?q= — Buscar usuarios
const searchUsersForChat = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({ users: [] });
        }
        const users = await messagesModel.searchUsers(q, req.user.id);
        res.json({ users });
    } catch (err) {
        console.error('Error buscando usuarios:', err);
        res.status(500).json({ error: true, mensaje: 'Error en la búsqueda' });
    }
};

// POST /api/v1/messages/conversation — Obtener o crear conversación con un usuario
const startConversation = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: true, mensaje: 'userId es obligatorio' });
        }
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ error: true, mensaje: 'No puedes enviar mensajes a ti mismo' });
        }
        const conversation = await messagesModel.getOrCreateConversation(req.user.id, userId);
        // Return enriched conversation with other user data
        const enriched = await messagesModel.getConversationWithUser(conversation.id, req.user.id);
        res.json({ conversation: enriched || conversation });
    } catch (err) {
        console.error('Error iniciando conversación:', err);
        res.status(500).json({ error: true, mensaje: 'Error al iniciar conversación' });
    }
};

// GET /api/v1/messages/:conversationId — Obtener mensajes de una conversación
const getMessages = async (req, res) => {
    try {
        const conversationId = parseInt(req.params.conversationId);
        const isParticipant = await messagesModel.isParticipant(conversationId, req.user.id);
        if (!isParticipant) {
            return res.status(403).json({ error: true, mensaje: 'No tienes acceso a esta conversación' });
        }

        const before = req.query.before ? parseInt(req.query.before) : null;
        const limit = parseInt(req.query.limit) || 50;

        await messagesModel.markAsRead(conversationId, req.user.id);

        const messages = await messagesModel.getMessages(conversationId, { limit, before });

        // Enrich post-type messages with shared post preview data
        const postIds = messages
            .filter(m => m.media_type === 'post' && m.media_url)
            .map(m => parseInt(m.media_url))
            .filter(id => !isNaN(id));
        if (postIds.length > 0) {
            const previews = await socialModel.getPostPreviews(postIds);
            for (const msg of messages) {
                if (msg.media_type === 'post' && msg.media_url) {
                    msg.shared_post = previews[parseInt(msg.media_url)] || null;
                }
            }
        }

        res.json({ messages, hasMore: messages.length === limit });
    } catch (err) {
        console.error('Error obteniendo mensajes:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener mensajes' });
    }
};

// POST /api/v1/messages/:conversationId — Enviar mensaje (texto o media)
const sendMessage = async (req, res) => {
    try {
        const conversationId = parseInt(req.params.conversationId);
        const { text, mediaType: bodyMediaType, sharedPostId } = req.body;

        const isParticipant = await messagesModel.isParticipant(conversationId, req.user.id);
        if (!isParticipant) {
            return res.status(403).json({ error: true, mensaje: 'No tienes acceso a esta conversación' });
        }

        let mediaUrl = null;
        let mediaType = bodyMediaType || null;

        // Handle file upload (photo or audio)
        if (req.file) {
            mediaUrl = `/uploads/messages/${req.file.filename}`;
            console.log('Media upload:', req.file.originalname, req.file.mimetype, req.file.size, 'bytes');
            if (!mediaType) {
                mediaType = req.file.mimetype.startsWith('audio/') ? 'audio' : 'photo';
            }
        } else if (bodyMediaType === 'audio' || bodyMediaType === 'photo') {
            console.log('WARN: mediaType es', bodyMediaType, 'pero req.file es null. Body:', JSON.stringify(req.body));
        }

        // Handle shared post
        if (sharedPostId) {
            mediaType = 'post';
            mediaUrl = String(sharedPostId);
        }

        if (!text?.trim() && !mediaUrl) {
            return res.status(400).json({ error: true, mensaje: 'El mensaje necesita texto o contenido' });
        }
        if (text && text.trim().length > 1000) {
            return res.status(400).json({ error: true, mensaje: 'El mensaje no puede superar 1000 caracteres' });
        }

        const message = await messagesModel.sendMessage(
            conversationId, req.user.id, (text || '').trim(), mediaUrl, mediaType
        );
        res.status(201).json({ message });
    } catch (err) {
        console.error('Error enviando mensaje:', err);
        res.status(500).json({ error: true, mensaje: 'Error al enviar mensaje' });
    }
};

// PUT /api/v1/messages/:conversationId/read — Marcar como leídos
const markRead = async (req, res) => {
    try {
        const conversationId = parseInt(req.params.conversationId);
        const isParticipant = await messagesModel.isParticipant(conversationId, req.user.id);
        if (!isParticipant) {
            return res.status(403).json({ error: true, mensaje: 'No tienes acceso' });
        }
        await messagesModel.markAsRead(conversationId, req.user.id);
        res.json({ mensaje: 'Mensajes marcados como leídos' });
    } catch (err) {
        console.error('Error marcando leídos:', err);
        res.status(500).json({ error: true, mensaje: 'Error al marcar leídos' });
    }
};

module.exports = { getConversations, getUnreadCount, searchUsersForChat, startConversation, getMessages, sendMessage, markRead, msgUpload };
