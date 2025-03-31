/**
 * Authentication routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const auth = require('../middlewares/auth');

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get current user (requires authentication)
router.get('/me', auth, authController.getCurrentUser);

// Update user profile (requires authentication)
router.put('/profile', auth, authController.updateProfile);

// Update user password (requires authentication)
router.put('/password', auth, authController.updatePassword);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Facebook OAuth routes
router.get('/facebook', authController.facebookAuth);
router.get('/facebook/callback', authController.facebookCallback);

// Logout user
router.post('/logout', auth, authController.logout);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Request password reset
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
