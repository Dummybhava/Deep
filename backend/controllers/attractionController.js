/**
 * Attraction controller for Smart City Application
 */
const Attraction = require('../models/Attraction');
const sitecoreService = require('../services/sitecoreService');

// Get all attractions
exports.getAllAttractions = async (req, res) => {
  try {
    const attractions = await Attraction.find({});
    res.json(attractions);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
};

// Get attractions by category
exports.getAttractionsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['landmark', 'food', 'retail', 'recreation', 'entertainment', 'education', 'service', 'other'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query
    const attractions = await Attraction.find({ 
      category, 
      publishedStatus: 'published' 
    })
      .sort({ featured: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .select('name shortDescription category type images location rating featured price');
    
    // Get total count for pagination
    const total = await Attraction.countDocuments({ 
      category, 
      publishedStatus: 'published' 
    });
    
    res.json({
      attractions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get attractions by category error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get nearby attractions
exports.getNearbyAttractions = async (req, res) => {
  try {
    const { longitude, latitude, distance = 2 } = req.query;
    
    // Validate coordinates
    if (!longitude || !latitude) {
      return res.status(400).json({ 
        message: 'Longitude and latitude are required' 
      });
    }
    
    // Convert string parameters to numbers
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const dist = parseFloat(distance); // in kilometers
    
    if (isNaN(lng) || isNaN(lat) || isNaN(dist)) {
      return res.status(400).json({ 
        message: 'Invalid coordinates or distance' 
      });
    }
    
    // Find nearby attractions
    const attractions = await Attraction.find({
      publishedStatus: 'published',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: dist * 1000 // convert km to meters
        }
      }
    })
      .limit(20)
      .select('name shortDescription category type images location rating featured price');
    
    res.json(attractions);
  } catch (err) {
    console.error('Get nearby attractions error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get attraction by ID
exports.getAttractionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find attraction
    const attraction = await Attraction.findById(id);
    
    if (!attraction) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    // Check if published or user is admin
    if (attraction.publishedStatus !== 'published' && 
        (!req.user || !req.user.roles.includes('admin'))) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    res.json(attraction);
  } catch (err) {
    console.error('Get attraction by ID error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get attraction reviews
exports.getAttractionReviews = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find attraction
    const attraction = await Attraction.findById(id)
      .populate({
        path: 'reviews.user',
        select: 'firstName lastName avatar'
      });
    
    if (!attraction) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    // Extract and return reviews
    const reviews = attraction.reviews.map(review => ({
      id: review._id,
      user: {
        id: review.user._id,
        name: `${review.user.firstName} ${review.user.lastName}`,
        avatar: review.user.avatar
      },
      rating: review.rating,
      comment: review.comment,
      date: review.date
    }));
    
    res.json(reviews);
  } catch (err) {
    console.error('Get attraction reviews error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add new attraction (admin only)
exports.addAttraction = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin') && 
        !req.user.roles.includes('content_manager')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const {
      name,
      description,
      shortDescription,
      category,
      subCategory,
      type,
      coordinates,
      address,
      contactInfo,
      images,
      amenities,
      hoursOfOperation,
      featured,
      price,
      accessibility,
      tags,
      publishedStatus,
      foodOptions,
      retailInfo
    } = req.body;
    
    // Create new attraction
    const attraction = new Attraction({
      name,
      description,
      shortDescription,
      category,
      subCategory,
      type,
      location: {
        type: 'Point',
        coordinates
      },
      address,
      contactInfo,
      images,
      amenities,
      hoursOfOperation,
      featured,
      price,
      accessibility,
      tags,
      publishedStatus: publishedStatus || 'published',
      foodOptions,
      retailInfo
    });
    
    // Save to database
    await attraction.save();
    
    // If Sitecore integration is enabled, sync to Sitecore
    if (process.env.SITECORE_ENABLED === 'true') {
      try {
        const sitecoreId = await sitecoreService.createAttraction(attraction);
        
        if (sitecoreId) {
          attraction.sitecoreId = sitecoreId;
          await attraction.save();
        }
      } catch (sitecoreErr) {
        console.error('Sitecore sync error:', sitecoreErr.message);
        // Continue even if Sitecore sync fails
      }
    }
    
    res.status(201).json(attraction);
  } catch (err) {
    console.error('Add attraction error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update attraction (admin only)
exports.updateAttraction = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin') && 
        !req.user.roles.includes('content_manager')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find attraction
    let attraction = await Attraction.findById(id);
    
    if (!attraction) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    // Update fields
    const updateFields = req.body;
    
    // Handle location separately
    if (updateFields.coordinates) {
      updateFields.location = {
        type: 'Point',
        coordinates: updateFields.coordinates
      };
      delete updateFields.coordinates;
    }
    
    // Update attraction
    attraction = await Attraction.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    // If Sitecore integration is enabled, sync to Sitecore
    if (process.env.SITECORE_ENABLED === 'true' && attraction.sitecoreId) {
      try {
        await sitecoreService.updateAttraction(attraction);
      } catch (sitecoreErr) {
        console.error('Sitecore sync error:', sitecoreErr.message);
        // Continue even if Sitecore sync fails
      }
    }
    
    res.json(attraction);
  } catch (err) {
    console.error('Update attraction error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete attraction (admin only)
exports.deleteAttraction = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find attraction
    const attraction = await Attraction.findById(id);
    
    if (!attraction) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    // Delete from Sitecore if integration is enabled
    if (process.env.SITECORE_ENABLED === 'true' && attraction.sitecoreId) {
      try {
        await sitecoreService.deleteAttraction(attraction.sitecoreId);
      } catch (sitecoreErr) {
        console.error('Sitecore delete error:', sitecoreErr.message);
        // Continue even if Sitecore delete fails
      }
    }
    
    // Delete attraction
    await Attraction.findByIdAndDelete(id);
    
    res.json({ message: 'Attraction deleted successfully' });
  } catch (err) {
    console.error('Delete attraction error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add attraction review
exports.addAttractionReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5' 
      });
    }
    
    // Find attraction
    const attraction = await Attraction.findById(id);
    
    if (!attraction) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    // Check if user already submitted a review
    const existingReviewIndex = attraction.reviews.findIndex(
      review => review.user.toString() === req.user.id
    );
    
    if (existingReviewIndex !== -1) {
      // Update existing review
      attraction.reviews[existingReviewIndex].rating = rating;
      attraction.reviews[existingReviewIndex].comment = comment;
      attraction.reviews[existingReviewIndex].date = Date.now();
    } else {
      // Add new review
      attraction.reviews.push({
        user: req.user.id,
        rating,
        comment,
        date: Date.now()
      });
    }
    
    // Update attraction rating average
    attraction.updateRatingAverage();
    
    // Save changes
    await attraction.save();
    
    res.json({ 
      message: 'Review added successfully',
      rating: attraction.rating
    });
  } catch (err) {
    console.error('Add review error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get food attractions
exports.getFoodAttractions = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtering
    const filter = { 
      category: 'food',
      publishedStatus: 'published'
    };
    
    // Apply cuisine filter if specified
    if (req.query.cuisine) {
      filter['foodOptions.cuisine'] = req.query.cuisine;
    }
    
    // Apply dietary options filter if specified
    if (req.query.dietary) {
      filter['foodOptions.dietaryOptions'] = req.query.dietary;
    }
    
    // Execute query
    const attractions = await Attraction.find(filter)
      .sort({ featured: -1, rating: -1 })
      .skip(skip)
      .limit(limit)
      .select('name shortDescription category images location rating featured price foodOptions');
    
    // Get total count for pagination
    const total = await Attraction.countDocuments(filter);
    
    res.json({
      attractions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get food attractions error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get retail attractions
exports.getRetailAttractions = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtering
    const filter = { 
      category: 'retail',
      publishedStatus: 'published'
    };
    
    // Apply brand filter if specified
    if (req.query.brand) {
      filter['retailInfo.brands'] = req.query.brand;
    }
    
    // Apply product filter if specified
    if (req.query.product) {
      filter['retailInfo.products'] = req.query.product;
    }
    
    // Execute query
    const attractions = await Attraction.find(filter)
      .sort({ featured: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .select('name shortDescription category images location rating featured price retailInfo');
    
    // Get total count for pagination
    const total = await Attraction.countDocuments(filter);
    
    res.json({
      attractions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get retail attractions error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
