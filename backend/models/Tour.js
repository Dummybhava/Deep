/**
 * Tour model for Smart City Application
 * Used for self-guided tours
 */
const mongoose = require('mongoose');

// Tour Stop Schema (embedded in Tour)
const TourStopSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    default: 10
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  },
  attraction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attraction'
  },
  images: [{
    url: String,
    caption: String
  }],
  audioGuide: {
    url: String,
    durationSeconds: Number,
    transcriptUrl: String
  },
  recommendedTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  }
});

// Tour Schema
const TourSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['history', 'culture', 'food', 'nature', 'architecture', 'art', 'family', 'leisure']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging'],
    default: 'easy'
  },
  estimatedDuration: {
    type: Number, // Duration in minutes
    required: true
  },
  distance: {
    type: Number, // Distance in kilometers
    required: true
  },
  recommendedTransport: {
    type: String,
    enum: ['walking', 'bicycle', 'car', 'public_transport'],
    default: 'walking'
  },
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    strollerAccessible: {
      type: Boolean,
      default: false
    },
    petFriendly: {
      type: Boolean,
      default: false
    },
    accessibilityNotes: String
  },
  stops: [TourStopSchema],
  path: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: [[Number]] // Array of [longitude, latitude] pairs
  },
  images: [{
    url: String,
    caption: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  seasonality: {
    type: [String],
    enum: ['spring', 'summer', 'fall', 'winter', 'all_year'],
    default: ['all_year']
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  publishedStatus: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  completedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    },
    rating: Number,
    feedback: String
  }],
  sitecoreId: String, // Reference to Sitecore CMS
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create spatial indexes
TourSchema.index({ 'path': '2dsphere' });
TourSchema.index({ 'stops.location': '2dsphere' });

// Update updatedAt on save
TourSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate slug from title before saving
TourSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Method to update average rating
TourSchema.methods.updateRatingAverage = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
    return;
  }
  
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.reviews.length;
  this.rating.count = this.reviews.length;
};

module.exports = mongoose.model('Tour', TourSchema);
