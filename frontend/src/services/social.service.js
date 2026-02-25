// Servicio social — peticiones al backend
import api from './api';

// Obtener feed público
export const getFeed = async (limit = 20, offset = 0, mode = 'discover') => {
    const { data } = await api.get(`/social/feed?limit=${limit}&offset=${offset}&mode=${mode}`);
    return data;
};

// Obtener mis outfits compartidos
export const getMyShared = async () => {
    const { data } = await api.get('/social/mine');
    return data;
};

// Compartir outfit al feed (con fotos opcionales)
export const shareOutfit = async (outfitId, caption, photos = []) => {
    const formData = new FormData();
    formData.append('outfitId', outfitId);
    formData.append('caption', caption || '');
    photos.forEach((uri, i) => {
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        formData.append('photos', {
            uri,
            name: `photo_${i}.${ext}`,
            type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
    });
    const { data } = await api.post('/social/share', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
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

// ── Likers ───────────────────────────────────────────

// Obtener quiénes dieron like a un post
export const getLikers = async (postId) => {
    const { data } = await api.get(`/social/${postId}/likers`);
    return data;
};

// ── Búsqueda ─────────────────────────────────────────

// Buscar publicaciones y usuarios
export const searchSocial = async (query) => {
    const { data } = await api.get(`/social/search?q=${encodeURIComponent(query)}`);
    return data; // { posts: [], users: [] }
};
