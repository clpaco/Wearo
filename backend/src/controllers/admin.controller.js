// Controlador Admin — gestion de usuarios, contenido y estadisticas
const adminModel = require('../models/admin.model');

// GET /api/v1/admin/users
const getUsers = async (req, res) => {
    try {
        const users = await adminModel.getAllUsers();
        res.json({ users });
    } catch (err) {
        console.error('Admin getUsers error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo usuarios' });
    }
};

// PUT /api/v1/admin/users/:id/toggle
const toggleUser = async (req, res) => {
    try {
        const { id } = req.params;
        // No permitir desactivarse a si mismo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: true, mensaje: 'No puedes desactivar tu propia cuenta' });
        }
        const { disabled } = req.body;
        const user = await adminModel.toggleUserDisabled(id, disabled, req.user.id);
        if (!user) {
            return res.status(404).json({ error: true, mensaje: 'Usuario no encontrado' });
        }
        res.json({ mensaje: disabled ? 'Usuario desactivado' : 'Usuario activado', user });
    } catch (err) {
        console.error('Admin toggleUser error:', err);
        res.status(500).json({ error: true, mensaje: 'Error actualizando usuario' });
    }
};

// GET /api/v1/admin/posts
const getPosts = async (req, res) => {
    try {
        const posts = await adminModel.getRecentPosts();
        res.json({ posts });
    } catch (err) {
        console.error('Admin getPosts error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo posts' });
    }
};

// DELETE /api/v1/admin/posts/:id
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await adminModel.deletePost(id, req.user.id);
        if (!deleted) {
            return res.status(404).json({ error: true, mensaje: 'Post no encontrado' });
        }
        res.json({ mensaje: 'Post eliminado' });
    } catch (err) {
        console.error('Admin deletePost error:', err);
        res.status(500).json({ error: true, mensaje: 'Error eliminando post' });
    }
};

// GET /api/v1/admin/comments
const getComments = async (req, res) => {
    try {
        const comments = await adminModel.getRecentComments();
        res.json({ comments });
    } catch (err) {
        console.error('Admin getComments error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo comentarios' });
    }
};

// DELETE /api/v1/admin/comments/:id
const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await adminModel.deleteComment(id);
        if (!deleted) {
            return res.status(404).json({ error: true, mensaje: 'Comentario no encontrado' });
        }
        res.json({ mensaje: 'Comentario eliminado' });
    } catch (err) {
        console.error('Admin deleteComment error:', err);
        res.status(500).json({ error: true, mensaje: 'Error eliminando comentario' });
    }
};

// GET /api/v1/admin/stats
const getStats = async (req, res) => {
    try {
        const stats = await adminModel.getGlobalStats();
        res.json({ stats });
    } catch (err) {
        console.error('Admin getStats error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo estadisticas' });
    }
};

// GET /api/v1/admin/my-stats
const getMyStats = async (req, res) => {
    try {
        const stats = await adminModel.getAdminUserStats(req.user.id);
        res.json({ stats });
    } catch (err) {
        console.error('Admin getMyStats error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo estadisticas de admin' });
    }
};

// POST /api/v1/admin/users/create
const createUser = async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: true, mensaje: 'Email, contraseña y nombre son obligatorios' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: true, mensaje: 'La contraseña debe tener al menos 8 caracteres' });
        }
        const user = await adminModel.createAdminUser(email, password, fullName);
        res.status(201).json({ mensaje: 'Admin creado', user });
    } catch (err) {
        console.error('Admin createUser error:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: true, mensaje: 'Ya existe un usuario con ese email' });
        }
        res.status(500).json({ error: true, mensaje: 'Error creando admin' });
    }
};

// DELETE /api/v1/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: true, mensaje: 'No puedes eliminar tu propia cuenta' });
        }
        const deleted = await adminModel.deleteAdminUser(id);
        if (!deleted) {
            return res.status(404).json({ error: true, mensaje: 'Solo se pueden eliminar cuentas de admin' });
        }
        res.json({ mensaje: 'Cuenta de admin eliminada', user: deleted });
    } catch (err) {
        console.error('Admin deleteUser error:', err);
        res.status(500).json({ error: true, mensaje: 'Error eliminando cuenta' });
    }
};

// GET /api/v1/admin/my-actions
const getMyActions = async (req, res) => {
    try {
        const actions = await adminModel.getMyActions(req.user.id);
        res.json({ actions });
    } catch (err) {
        console.error('Admin getMyActions error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo acciones' });
    }
};

// PUT /api/v1/admin/posts/:id/restore
const restorePost = async (req, res) => {
    try {
        const result = await adminModel.restorePost(req.params.id);
        if (!result) return res.status(404).json({ error: true, mensaje: 'Post no encontrado' });
        res.json({ mensaje: 'Post restaurado' });
    } catch (err) {
        console.error('Admin restorePost error:', err);
        res.status(500).json({ error: true, mensaje: 'Error restaurando post' });
    }
};

// PUT /api/v1/admin/users/:id/restore
const restoreUser = async (req, res) => {
    try {
        const result = await adminModel.restoreUser(req.params.id);
        if (!result) return res.status(404).json({ error: true, mensaje: 'Usuario no encontrado' });
        res.json({ mensaje: 'Usuario restaurado', user: result });
    } catch (err) {
        console.error('Admin restoreUser error:', err);
        res.status(500).json({ error: true, mensaje: 'Error restaurando usuario' });
    }
};

// GET /api/v1/admin/posts/users — Posts de usuarios normales
const getUserPosts = async (req, res) => {
    try {
        const posts = await adminModel.getRecentUserPosts();
        res.json({ posts });
    } catch (err) {
        console.error('Admin getUserPosts error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo posts de usuarios' });
    }
};

// GET /api/v1/admin/posts/deleted — Posts eliminados (todos)
const getDeletedPosts = async (req, res) => {
    try {
        const posts = await adminModel.getDeletedPosts();
        res.json({ posts });
    } catch (err) {
        console.error('Admin getDeletedPosts error:', err);
        res.status(500).json({ error: true, mensaje: 'Error obteniendo posts eliminados' });
    }
};

module.exports = { getUsers, toggleUser, getPosts, getUserPosts, getDeletedPosts, deletePost, getComments, deleteComment, getStats, getMyStats, createUser, deleteUser, getMyActions, restorePost, restoreUser };
