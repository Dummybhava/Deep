/**
 * User management routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// Admin routes for user management (admin only)
router.get('/', auth, userController.getAllUsers);
router.get('/:id', auth, userController.getUserById);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, userController.deleteUser);
router.put('/:id/role', auth, userController.updateUserRole);

// User profile routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/profile/privacy', auth, userController.updatePrivacySettings);
router.put('/profile/avatar', auth, userController.updateAvatar);
router.put('/profile/preferences', auth, userController.updatePreferences);

// User activity routes
router.get('/activity', auth, userController.getUserActivity);
router.get('/saved-items', auth, userController.getSavedItems);
router.post('/saved-items', auth, userController.saveItem);
router.delete('/saved-items/:itemId', auth, userController.removeSavedItem);

module.exports = router;
