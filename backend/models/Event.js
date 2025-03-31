/**
 * Event model for Smart City Application
 */
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
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
    enum: ['conference', 'exhibition', 'concert', 'festival', 'sport', 'workshop', 'community', 'other']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  startTime: { // If not allDay
    type: String, // Format: "HH:MM"
  },
  endTime: { // If not allDay
    type: String, // Format: "HH:MM"
  },
  recurrence: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number, // every X days/weeks/months/years
    daysOfWeek: [Number], // 0 (Sunday) to 6 (Saturday)
    endDate: Date
  },
  location: {
    type: {
      type: String,
      enum: ['venue', 'attraction', 'coordinates', 'online']
    },
    // If venue
    venueName: String,
    // If attraction
    attractionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attraction'
    },
    // If coordinates
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [longitude, latitude]
    },
    // Common venue details
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
  virtualEventUrl: String, // For online events
  organizer: {
    name: String,
    email: String,
    phone: String,
    website: String
  },
  images: [{
    url: String,
    caption: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  ticketInfo: {
    isFree: {
      type: Boolean,
      default: true
    },
    price: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    ticketUrl: String,
    availableTickets: Number,
    registrationRequired: {
      type: Boolean,
      default: false
    }
  },
  capacity: Number,
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['attending', 'interested', 'declined'],
      default: 'attending'
    },
    dateResponded: {
      type: Date,
      default: Date.now
    }
  }],
  accessibility: {
    wheelchairAccessible: Boolean,
    signLanguageInterpreter: Boolean,
    assistiveTechnology: Boolean,
    accessibilityNotes: String
  },
  tags: [String],
  featured: {
    type: Boolean,
    default: false
  },
  publishedStatus: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'archived'],
    default: 'published'
  },
  sitecoreId: String, // Reference to Sitecore CMS
  createdBy: {
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

// Create 2dsphere index for location coordinates
EventSchema.index({ 'location.coordinates': '2dsphere' });

// Update updatedAt on save
EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate slug from title before saving
EventSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Method to check if event is past
EventSchema.methods.isPast = function() {
  const now = new Date();
  return this.endDate < now;
};

// Method to check if event is ongoing
EventSchema.methods.isOngoing = function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
};

// Virtual for formatted date range
EventSchema.virtual('dateRange').get(function() {
  const startDate = this.startDate.toLocaleDateString();
  const endDate = this.endDate.toLocaleDateString();
  
  if (startDate === endDate) {
    return startDate;
  }
  
  return `${startDate} - ${endDate}`;
});

// Method to get count of attendees
EventSchema.methods.getAttendeeCount = function() {
  return this.attendees.filter(a => a.status === 'attending').length;
};

module.exports = mongoose.model('Event', EventSchema);
