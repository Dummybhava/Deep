/**
 * Notification model for Smart City Application
 */
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'system', 'event', 'transportation', 'news', 
      'feedback', 'incident', 'account', 'tour'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    // Dynamic data related to the notification
    type: mongoose.Schema.Types.Mixed
  },
  relatedTo: {
    type: {
      type: String,
      enum: ['Event', 'Attraction', 'TransportationRequest', 'Feedback', 'Incident', 'Tour']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  // Delivery status
  status: {
    read: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    delivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: Date,
    error: String
  },
  // For scheduled notifications
  scheduleDate: Date,
  expiryDate: Date,
  // For specific user segment targeting
  targetSegment: {
    roles: [String],
    languages: [String]
  },
  // If it's a global broadcast
  isBroadcast: {
    type: Boolean,
    default: false
  },
  // Creator of the notification (for admin broadcasts)
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps before saving
NotificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Mark as read
NotificationSchema.methods.markAsRead = function() {
  this.status.read = true;
  this.status.readAt = new Date();
  return this.save();
};

// Check if notification is expired
NotificationSchema.methods.isExpired = function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

// Index for efficient querying
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ 'status.read': 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ isBroadcast: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
