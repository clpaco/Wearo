// Rutas de perfil de usuario y seguidores
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getMe, getProfile, updateMe, uploadAvatar,
    getUserPosts, followUser, unfollowUser,
    getFollowers, getFollowing,
} = require('../controllers/profile.controller');

router.use(verifyToken);

// Mi perfil
router.get('/me',          getMe);
router.put('/me',          updateMe);
router.put('/me/avatar',   uploadAvatar);

// Perfil público & posts
router.get('/:id',         getProfile);
router.get('/:id/posts',   getUserPosts);

// Seguir / dejar de seguir
router.post('/:id/follow',   followUser);
router.delete('/:id/follow', unfollowUser);

// Listas
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

module.exports = router;
