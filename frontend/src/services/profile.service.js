// Servicio de perfil — peticiones al backend
import api from './api';

// Mi perfil
export const getMyProfile = async () => {
    const { data } = await api.get('/users/me');
    return data;
};

// Actualizar mi perfil
export const updateMyProfile = async ({ fullName, bio }) => {
    const { data } = await api.put('/users/me', { fullName, bio });
    return data;
};

// Subir avatar (FormData)
export const uploadAvatar = async (formData) => {
    const { data } = await api.put('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

// Perfil público de cualquier usuario
export const getUserProfile = async (userId) => {
    const { data } = await api.get(`/users/${userId}`);
    return data;
};

// Posts compartidos de un usuario
export const getUserPosts = async (userId, limit = 20, offset = 0) => {
    const { data } = await api.get(`/users/${userId}/posts?limit=${limit}&offset=${offset}`);
    return data;
};

// Seguir usuario
export const followUser = async (userId) => {
    const { data } = await api.post(`/users/${userId}/follow`);
    return data;
};

// Dejar de seguir usuario
export const unfollowUser = async (userId) => {
    const { data } = await api.delete(`/users/${userId}/follow`);
    return data;
};

// Lista de seguidores
export const getFollowers = async (userId) => {
    const { data } = await api.get(`/users/${userId}/followers`);
    return data;
};

// Lista de seguidos
export const getFollowing = async (userId) => {
    const { data } = await api.get(`/users/${userId}/following`);
    return data;
};
