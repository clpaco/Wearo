// Servicio de Mensajes Directos — peticiones al backend
import api from './api';

// Listar conversaciones del usuario
export const getConversations = async () => {
    const { data } = await api.get('/messages');
    return data;
};

// Total de mensajes no leídos
export const getUnreadCount = async () => {
    const { data } = await api.get('/messages/unread');
    return data;
};

// Buscar usuarios para chatear
export const searchUsers = async (query) => {
    const { data } = await api.get('/messages/search', { params: { q: query } });
    return data;
};

// Crear o obtener conversación con un usuario
export const startConversation = async (userId) => {
    const { data } = await api.post('/messages/conversation', { userId });
    return data;
};

// Obtener mensajes de una conversación
export const getMessages = async (conversationId, { limit = 50, before = null } = {}) => {
    const params = { limit };
    if (before) params.before = before;
    const { data } = await api.get(`/messages/${conversationId}`, { params });
    return data;
};

// Enviar mensaje de texto
export const sendMessage = async (conversationId, text) => {
    const { data } = await api.post(`/messages/${conversationId}`, { text });
    return data;
};

// Enviar mensaje con media (foto o audio)
export const sendMediaMessage = async (conversationId, mediaUri, mediaType) => {
    const formData = new FormData();
    const ext = mediaType === 'audio' ? 'm4a' : 'jpg';
    const mime = mediaType === 'audio' ? 'audio/m4a' : 'image/jpeg';
    formData.append('media', {
        uri: mediaUri,
        name: `msg_${Date.now()}.${ext}`,
        type: mime,
    });
    formData.append('mediaType', mediaType === 'audio' ? 'audio' : 'photo');
    formData.append('text', '');
    const { data } = await api.post(`/messages/${conversationId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

// Enviar publicación compartida como mensaje
export const sendSharedPostMessage = async (conversationId, postId) => {
    const { data } = await api.post(`/messages/${conversationId}`, {
        text: `📌 Publicación compartida #${postId}`,
        sharedPostId: postId,
    });
    return data;
};

// Marcar como leídos
export const markAsRead = async (conversationId) => {
    const { data } = await api.put(`/messages/${conversationId}/read`);
    return data;
};
