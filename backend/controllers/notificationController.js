/**
 * Notification controller for Smart City Application
 * Handles notification management and delivery
 */
const { Notification } = require('../models/Notification');
const User = require('../models/User');
const config = require('../config/config');
const admin = require('firebase-admin');
const WebSocket = require('ws');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK if FCM is configured
if (config.notifications.fcmServerKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    logger.error('Firebase admin initialization error:', error);
  }
}

// Get user notifications - IMPROVED VERSION
exports.getUserNotifications = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }

    // Validate and sanitize inputs
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 100) || 20; // Limit max 100 items
    const skip = (page - 1) * limit;
    
    // Build filter safely
    const filter = {
      recipient: req.user.id
    };
    
    // Safely handle type filter
    if (req.query.type && typeof req.query.type === 'string') {
      filter.type = req.query.type;
    }
    
    // Safely handle read status filter
    if (typeof req.query.read !== 'undefined') {
      filter['status.read'] = req.query.read === 'true';
    }
    
    // Execute query with error handling
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipient: req.user.id,
        'status.read': false
      })
    ]);
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('Get user notifications error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// [Rest of your controller methods remain exactly the same...]
// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find notification
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Mark as read
    notification.status.read = true;
    notification.status.readAt = Date.now();
    
    await notification.save();
    
    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (err) {
    console.error('Mark notification as read error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find notification
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Delete notification
    await Notification.findByIdAndDelete(id);
    
    res.json({
      message: 'Notification deleted'
    });
  } catch (err) {
    console.error('Delete notification error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    // Update all unread notifications for user
    const result = await Notification.updateMany(
      {
        recipient: req.user.id,
        'status.read': false
      },
      {
        $set: {
          'status.read': true,
          'status.readAt': Date.now()
        }
      }
    );
    
    res.json({
      message: 'All notifications marked as read',
      count: result.nModified
    });
  } catch (err) {
    console.error('Mark all as read error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register device for push notifications
exports.registerDevice = async (req, res) => {
  try {
    const { deviceId, platform, token } = req.body;
    
    if (!deviceId || !platform || !token) {
      return res.status(400).json({ 
        message: 'Device ID, platform and token are required' 
      });
    }
    
    // Validate platform
    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ message: 'Invalid platform' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if device already exists
    const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceId);
    
    if (deviceIndex !== -1) {
      // Update existing device
      user.devices[deviceIndex].token = token;
      user.devices[deviceIndex].platform = platform;
      user.devices[deviceIndex].lastUsed = Date.now();
    } else {
      // Add new device
      user.devices.push({
        deviceId,
        platform,
        token,
        lastUsed: Date.now()
      });
    }
    
    await user.save();
    
    res.json({
      message: 'Device registered successfully'
    });
  } catch (err) {
    console.error('Register device error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unregister device from push notifications
exports.unregisterDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove device
    user.devices = user.devices.filter(d => d.deviceId !== deviceId);
    
    await user.save();
    
    res.json({
      message: 'Device unregistered successfully'
    });
  } catch (err) {
    console.error('Unregister device error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update notification preferences
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { 
      email, 
      push, 
      events, 
      transportation, 
      news 
    } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update preferences
    if (email !== undefined) user.notificationPreferences.email = email;
    if (push !== undefined) user.notificationPreferences.push = push;
    if (events !== undefined) user.notificationPreferences.events = events;
    if (transportation !== undefined) user.notificationPreferences.transportation = transportation;
    if (news !== undefined) user.notificationPreferences.news = news;
    
    await user.save();
    
    res.json({
      message: 'Notification preferences updated successfully',
      preferences: user.notificationPreferences
    });
  } catch (err) {
    console.error('Update notification preferences error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get notification preferences
exports.getNotificationPreferences = async (req, res) => {
  try {
    // Find user
    const user = await User.findById(req.user.id).select('notificationPreferences');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.notificationPreferences);
  } catch (err) {
    console.error('Get notification preferences error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send notification (admin only)
exports.sendNotification = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { 
      recipients, 
      type, 
      title, 
      message, 
      data, 
      priority,
      scheduleDate,
      expiryDate,
      relatedTo
    } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || !title || !message) {
      return res.status(400).json({ 
        message: 'Recipients, title and message are required' 
      });
    }
    
    // Create notifications
    const notifications = recipients.map(recipientId => ({
      recipient: recipientId,
      type: type || 'system',
      title,
      message,
      data,
      priority: priority || 'normal',
      scheduleDate: scheduleDate ? new Date(scheduleDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      relatedTo,
      creator: req.user.id
    }));
    
    const savedNotifications = await Notification.insertMany(notifications);
    
    // Send push notifications
    for (const recipientId of recipients) {
      await sendPushNotification(recipientId, {
        title,
        body: message,
        data
      });
    }
    
    // Send real-time notifications via WebSocket
    // This will be handled by the WebSocket service
    
    res.status(201).json({
      message: `${savedNotifications.length} notifications sent successfully`,
      notifications: savedNotifications
    });
  } catch (err) {
    console.error('Send notification error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Broadcast notification to all users or user segments (admin only)
exports.broadcastNotification = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { 
      type, 
      title, 
      message, 
      data, 
      priority,
      targetSegment,
      scheduleDate,
      expiryDate,
      relatedTo
    } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ 
        message: 'Title and message are required' 
      });
    }
    
    // Build user filter based on target segment
    const userFilter = {};
    
    if (targetSegment) {
      if (targetSegment.roles && targetSegment.roles.length > 0) {
        userFilter.roles = { $in: targetSegment.roles };
      }
      
      if (targetSegment.languages && targetSegment.languages.length > 0) {
        userFilter.preferredLanguage = { $in: targetSegment.languages };
      }
    }
    
    // Find target users
    const users = await User.find(userFilter).select('_id');
    
    const recipientIds = users.map(user => user._id);
    
    if (recipientIds.length === 0) {
      return res.status(400).json({ 
        message: 'No users match the target segment' 
      });
    }
    
    // Create broadcast notification
    const broadcastNotification = new Notification({
      isBroadcast: true,
      type: type || 'system',
      title,
      message,
      data,
      priority: priority || 'normal',
      targetSegment,
      scheduleDate: scheduleDate ? new Date(scheduleDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      relatedTo,
      creator: req.user.id
    });
    
    await broadcastNotification.save();
    
    // Create individual notifications for each user
    const notifications = recipientIds.map(recipientId => ({
      recipient: recipientId,
      type: type || 'system',
      title,
      message,
      data,
      priority: priority || 'normal',
      scheduleDate: scheduleDate ? new Date(scheduleDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      relatedTo,
      creator: req.user.id
    }));
    
    // Use bulk insert for efficiency
    await Notification.insertMany(notifications);
    
    // Send push notifications in batches
    const batchSize = 100;
    for (let i = 0; i < recipientIds.length; i += batchSize) {
      const batch = recipientIds.slice(i, i + batchSize);
      
      for (const recipientId of batch) {
        try {
          await sendPushNotification(recipientId, {
            title,
            body: message,
            data
          });
        } catch (pushErr) {
          console.error(`Push notification error for user ${recipientId}:`, pushErr.message);
          // Continue sending to other users
        }
      }
    }
    
    res.status(201).json({
      message: `Broadcast notification sent to ${recipientIds.length} users`,
      broadcastId: broadcastNotification._id
    });
  } catch (err) {
    console.error('Broadcast notification error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to send push notification
async function sendPushNotification(userId, message) {
  try {
    // Find user devices
    const user = await User.findById(userId).select('devices notificationPreferences');
    
    if (!user || !user.notificationPreferences.push || user.devices.length === 0) {
      return;
    }
    
    // Group devices by platform
    const devicesByPlatform = {
      ios: [],
      android: [],
      web: []
    };
    
    user.devices.forEach(device => {
      if (devicesByPlatform[device.platform]) {
        devicesByPlatform[device.platform].push(device.token);
      }
    });
    
    // If Firebase Admin SDK is initialized
    if (admin.messaging) {
      // Send to Android and Web devices via FCM
      const fcmTokens = [
        ...devicesByPlatform.android,
        ...devicesByPlatform.web
      ];
      
      if (fcmTokens.length > 0) {
        await admin.messaging().sendMulticast({
          tokens: fcmTokens,
          notification: {
            title: message.title,
            body: message.body
          },
          data: message.data
        });
      }
      
      // Send to iOS devices via FCM
      if (devicesByPlatform.ios.length > 0) {
        await admin.messaging().sendMulticast({
          tokens: devicesByPlatform.ios,
          notification: {
            title: message.title,
            body: message.body
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          },
          data: message.data
        });
      }
    }
    
    // Send via WebSocket if available
    const wss = global.wss;
    if (wss) {
      wss.clients.forEach(client => {
        if (client.userId === userId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'notification',
            data: {
              title: message.title,
              body: message.body,
              ...message.data
            }
          }));
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Send push notification error:', error);
    throw error;
  }
}
