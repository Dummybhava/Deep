const mongoose = require('mongoose');

const AttractionSchema = new mongoose.Schema({
    id: {
      type: Number, // Mongoose uses Number instead of DataTypes.INTEGER
      autoIncrement: true, // Mongoose does not support auto-increment natively (Use a plugin like mongoose-sequence)
      primaryKey: true // Not needed in Mongoose
    },
    name: {
      type: String, // Replaced DataTypes.STRING
      required: true
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String // Changed from DataTypes.TEXT to String
    },
    shortDescription: {
      type: String
    },
    category: {
      type: String, // Mongoose does not support ENUM natively, handle it manually
      enum: ['landmark', 'food', 'retail', 'recreation', 'entertainment', 'education', 'service', 'other'],
      required: true
    },
    subCategory: {
      type: String
    },
    type: {
      type: String,
      enum: ['point', 'area', 'building']
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' }, // GeoJSON format for Mongoose
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,

    phone: String,
    email: String,
    website: String,

    images: {
      type: [String], // JSONB changed to an array of strings (URLs)
      default: []
    },

    amenities: {
      type: [String], // ARRAY type changed to Array
      default: []
    },

    hoursOfOperation: {
      type: Object, // JSONB changed to Object
      default: {}
    },

    featured: {
      type: Boolean,
      default: false
    },

    averageRating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    },

    priceLevel: {
      type: Number,
      default: 0
    },
    priceDescription: String,

    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    brailleSignage: {
      type: Boolean,
      default: false
    },
    audioGuides: {
      type: Boolean,
      default: false
    },
    serviceAnimalsAllowed: {
      type: Boolean,
      default: true
    },
    accessibilityRating: {
      type: Number
    },

    tags: {
      type: [String],
      default: []
    },

    publishedStatus: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published'
    },

    foodOptions: {
      type: Object,
      default: {}
    },

    retailInfo: {
      type: Object,
      default: {}
    },

    sitecoreId: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Attraction', AttractionSchema);
