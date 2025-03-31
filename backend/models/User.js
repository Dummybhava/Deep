/**
 * User model for Smart City Application
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.facebookId;
    },
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  roles: {
    type: [String],
    default: ['user'],
    enum: ['user', 'admin', 'driver', 'content_manager']
  },
  avatar: {
    type: String,
    default: ''
  },
  googleId: {
    type: String
  },
  facebookId: {
    type: String
  },
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    events: {
      type: Boolean,
      default: true
    },
    transportation: {
      type: Boolean,
      default: true
    },
    news: {
      type: Boolean,
      default: true
    }
  },
  devices: [{
    deviceId: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    token: String,
    lastUsed: Date
  }],
  privacySettings: {
    shareProfile: {
      type: Boolean,
      default: true
    },
    shareActivity: {
      type: Boolean,
      default: false
    },
    locationTracking: {
      type: Boolean,
      default: true
    }
  },
  savedItems: {
    attractions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attraction' }],
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    tours: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tour' }]
  },
  isDisabled: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
UserSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Only hash password if it's new or modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get user's public profile
UserSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  delete userObject.devices;
  
  return userObject;
};

module.exports = mongoose.model('User', UserSchema);
