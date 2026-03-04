// Servicio admin — llamadas a endpoints de administracion
import api from './api';

export const getUsers = async () => {
    const { data } = await api.get('/admin/users');
    return data.users;
};

export const toggleUser = async (id, disabled) => {
    const { data } = await api.put(`/admin/users/${id}/toggle`, { disabled });
    return data;
};

export const createAdminUser = async (email, password, fullName) => {
    const { data } = await api.post('/admin/users/create', { email, password, fullName });
    return data;
};

export const getPosts = async () => {
    const { data } = await api.get('/admin/posts');
    return data.posts;
};

export const getUserPosts = async () => {
    const { data } = await api.get('/admin/posts/users');
    return data.posts;
};

export const getDeletedPosts = async () => {
    const { data } = await api.get('/admin/posts/deleted');
    return data.posts;
};

export const deletePost = async (id) => {
    const { data } = await api.delete(`/admin/posts/${id}`);
    return data;
};

export const getComments = async () => {
    const { data } = await api.get('/admin/comments');
    return data.comments;
};

export const deleteComment = async (id) => {
    const { data } = await api.delete(`/admin/comments/${id}`);
    return data;
};

export const getStats = async () => {
    const { data } = await api.get('/admin/stats');
    return data.stats;
};

export const getMyStats = async () => {
    const { data } = await api.get('/admin/my-stats');
    return data.stats;
};

export const deleteAdminUser = async (id) => {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data;
};

// Soporte
export const submitSupportTicket = async (message) => {
    const { data } = await api.post('/support', { message });
    return data;
};

export const getSupportTickets = async (status) => {
    const params = status ? { status } : {};
    const { data } = await api.get('/admin/support', { params });
    return data.tickets;
};

export const assignTicket = async (id) => {
    const { data } = await api.put(`/admin/support/${id}/assign`);
    return data;
};

export const resolveTicket = async (id) => {
    const { data } = await api.put(`/admin/support/${id}/resolve`);
    return data;
};

// Acciones y restauracion
export const getMyActions = async () => {
    const { data } = await api.get('/admin/my-actions');
    return data.actions;
};

export const restorePost = async (id) => {
    const { data } = await api.put(`/admin/posts/${id}/restore`);
    return data;
};

export const restoreUser = async (id) => {
    const { data } = await api.put(`/admin/users/${id}/restore`);
    return data;
};
