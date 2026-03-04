// Rutas de administracion — protegidas con verifyToken + isAdmin
const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const adminCtrl = require('../controllers/admin.controller');
const supportCtrl = require('../controllers/support.controller');

// Todas las rutas requieren autenticacion + admin
router.use(verifyToken);
router.use(isAdmin);

// Usuarios
router.get('/users', adminCtrl.getUsers);
router.put('/users/:id/toggle', adminCtrl.toggleUser);
router.post('/users/create', adminCtrl.createUser);
router.delete('/users/:id', adminCtrl.deleteUser);
router.put('/users/:id/restore', adminCtrl.restoreUser);

// Contenido
router.get('/posts', adminCtrl.getPosts);
router.get('/posts/users', adminCtrl.getUserPosts);
router.get('/posts/deleted', adminCtrl.getDeletedPosts);
router.delete('/posts/:id', adminCtrl.deletePost);
router.put('/posts/:id/restore', adminCtrl.restorePost);
router.get('/comments', adminCtrl.getComments);
router.delete('/comments/:id', adminCtrl.deleteComment);

// Soporte
router.get('/support', supportCtrl.getTickets);
router.put('/support/:id/assign', supportCtrl.assignTicket);
router.put('/support/:id/resolve', supportCtrl.resolveTicket);

// Estadisticas
router.get('/stats', adminCtrl.getStats);
router.get('/my-stats', adminCtrl.getMyStats);
router.get('/my-actions', adminCtrl.getMyActions);

module.exports = router;
