// Servicio de Mensajes Directos — peticiones al backend
import api from './api';
import { Platform } from 'react-native';

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
    const isWeb = Platform.OS === 'web';
    const ext = mediaType === 'audio' ? (isWeb ? 'webm' : 'm4a') : 'jpg';
    const mime = mediaType === 'audio' ? (isWeb ? 'audio/webm' : 'audio/mp4') : 'image/jpeg';

    if (isWeb) {
        // En web, convertir URI a Blob real (FormData no acepta {uri,name,type})
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        formData.append('media', blob, `msg_${Date.now()}.${ext}`);
    } else {
        formData.append('media', {
            uri: mediaUri,
            name: `msg_${Date.now()}.${ext}`,
            type: mime,
        });
    }

    formData.append('mediaType', mediaType === 'audio' ? 'audio' : 'photo');
    formData.append('text', '');
    const { data } = await api.post(`/messages/${conversationId}`, formData, {
        headers: isWeb ? {} : { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
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
