// Servicio social — peticiones al backend
import api from './api';

// Obtener feed público
export const getFeed = async (limit = 20, offset = 0) => {
    const { data } = await api.get(`/social/feed?limit=${limit}&offset=${offset}`);
    return data;
};

// Obtener mis outfits compartidos
export const getMyShared = async () => {
    const { data } = await api.get('/social/mine');
    return data;
};

// Compartir outfit al feed
export const shareOutfit = async (outfitId, caption) => {
    const { data } = await api.post('/social/share', { outfitId, caption });
    return data;
};

// Retirar outfit del feed
export const unshareOutfit = async (sharedId) => {
    const { data } = await api.delete(`/social/${sharedId}`);
    return data;
};

// Dar like
export const likePost = async (sharedId) => {
    const { data } = await api.post(`/social/${sharedId}/like`);
    return data;
};

// Quitar like
export const unlikePost = async (sharedId) => {
    const { data } = await api.delete(`/social/${sharedId}/like`);
    return data;
};

// ── Comentarios ───────────────────────────────────────

// Obtener comentarios de un post
export const getComments = async (postId) => {
    const { data } = await api.get(`/social/${postId}/comments`);
    return data;
};

// Añadir comentario
export const postComment = async (postId, text) => {
    const { data } = await api.post(`/social/${postId}/comments`, { text });
    return data;
};

// Eliminar comentario propio
export const deleteComment = async (postId, commentId) => {
    const { data } = await api.delete(`/social/${postId}/comments/${commentId}`);
    return data;
};
