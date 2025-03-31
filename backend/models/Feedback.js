/**
 * Feedback and Incident models for Smart City Application
 */
const mongoose = require('mongoose');

// Feedback Schema
const FeedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['general', 'app', 'feature', 'transportation', 'event', 'attraction']
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  // Optional reference to related item
  relatedTo: {
    type: {
      type: String,
      enum: ['Event', 'Attraction', 'TransportationRoute', 'Tour']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  status: {
    type: String,
    enum: ['submitted', 'in_review', 'resolved', 'closed'],
    default: 'submitted'
  },
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  appVersion: String,
  deviceInfo: {
    platform: String,
    model: String,
    osVersion: String
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

// Incident Report Schema
const IncidentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  incidentType: {
    type: String,
    required: true,
    enum: ['safety', 'maintenance', 'security', 'emergency', 'other']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number], // [longitude, latitude]
    address: String,
    locationDescription: String
  },
  incidentDate: {
    type: Date,
    default: Date.now
  },
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['reported', 'under_investigation', 'in_progress', 'resolved', 'closed'],
    default: 'reported'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: {
    action: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    notes: String
  },
  contactRequested: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    platform: String,
    model: String,
    osVersion: String
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

// Create index for location
IncidentSchema.index({ 'location': '2dsphere' });

// Update timestamps before saving
FeedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

IncidentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Feedback = mongoose.model('Feedback', FeedbackSchema);
const Incident = mongoose.model('Incident', IncidentSchema);

module.exports = { Feedback, Incident };
