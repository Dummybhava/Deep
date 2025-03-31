/**
 * Notifications routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');

// Get user notifications
router.get('/', auth, notificationController.getUserNotifications);

// Mark notification as read
router.put('/:id/read', auth, notificationController.markNotificationAsRead);

// Delete notification
router.delete('/:id', auth, notificationController.deleteNotification);

// Mark all notifications as read
router.put('/read-all', auth, notificationController.markAllAsRead);

// Register device for push notifications
router.post('/device', auth, notificationController.registerDevice);

// Unregister device from push notifications
router.delete('/device/:deviceId', auth, notificationController.unregisterDevice);

// Update notification preferences
router.put('/preferences', auth, notificationController.updateNotificationPreferences);

// Get notification preferences
router.get('/preferences', auth, notificationController.getNotificationPreferences);

// Admin routes for sending notifications
router.post('/admin/send', auth, notificationController.sendNotification);
router.post('/admin/broadcast', auth, notificationController.broadcastNotification);

module.exports = router;
