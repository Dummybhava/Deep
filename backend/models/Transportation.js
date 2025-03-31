/**
 * Transportation models for Smart City Application
 */
const mongoose = require('mongoose');

// Transportation Route Schema
const RouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    required: true,
    enum: ['prt', 'bus', 'shuttle', 'courtesy']
  },
  color: {
    type: String,
    default: '#000000'
  },
  path: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: [[Number]] // Array of [longitude, latitude] pairs
  },
  stops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportationStop'
  }],
  schedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String, // Format: "HH:MM"
    endTime: String, // Format: "HH:MM"
    frequency: Number, // Minutes between departures
    exceptions: [{
      date: Date,
      operates: Boolean,
      startTime: String,
      endTime: String,
      frequency: Number
    }]
  }],
  active: {
    type: Boolean,
    default: true
  },
  externalId: String, // ID from external transportation system
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Transportation Stop Schema
const StopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  },
  address: String,
  amenities: [{
    type: {
      type: String,
      enum: ['shelter', 'bench', 'lighting', 'realtime_display', 'wheelchair', 'bicycle']
    },
    available: {
      type: Boolean,
      default: false
    }
  }],
  routes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportationRoute'
  }],
  externalId: String, // ID from external transportation system
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Vehicle Schema
const VehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['prt', 'bus', 'shuttle', 'courtesy']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number], // [longitude, latitude]
    heading: Number, // Direction in degrees (0-360)
    speed: Number, // Speed in km/h
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportationRoute'
  },
  capacity: {
    type: Number,
    default: 1
  },
  occupancy: {
    type: Number,
    default: 0
  },
  properties: {
    licensePlate: String,
    model: String,
    year: Number,
    color: String,
    features: [String],
    accessibility: {
      wheelchairAccessible: {
        type: Boolean,
        default: false
      }
    }
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  externalId: String, // ID from external transportation system
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Transportation Request Schema (for courtesy cars and shuttles)
const RequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['courtesy', 'shuttle'],
    default: 'courtesy'
  },
  pickup: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [longitude, latitude]
    },
    address: String,
    notes: String,
    time: Date // Requested pickup time
  },
  dropoff: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [longitude, latitude]
    },
    address: String,
    notes: String
  },
  passengers: {
    type: Number,
    default: 1,
    min: 1
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportationVehicle'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scheduledTime: Date, // For scheduled rides
  acceptedTime: Date,
  completedTime: Date,
  cancelledTime: Date,
  cancelReason: String,
  requestedFeatures: [String], // Wheelchair accessibility, child seat, etc.
  estimatedTime: Number, // Estimated time of arrival in minutes
  route: {
    distance: Number, // in kilometers
    duration: Number, // in minutes
    path: [[Number]] // Array of [longitude, latitude] coordinates
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

// Create indexes
RouteSchema.index({ 'path': '2dsphere' });
StopSchema.index({ 'location': '2dsphere' });
VehicleSchema.index({ 'location': '2dsphere' });
RequestSchema.index({ 'pickup.location': '2dsphere', 'dropoff.location': '2dsphere' });

// Create models
const TransportationRoute = mongoose.model('TransportationRoute', RouteSchema);
const TransportationStop = mongoose.model('TransportationStop', StopSchema);
const TransportationVehicle = mongoose.model('TransportationVehicle', VehicleSchema);
const TransportationRequest = mongoose.model('TransportationRequest', RequestSchema);

module.exports = {
  TransportationRoute,
  TransportationStop,
  TransportationVehicle,
  TransportationRequest
};
