// controllers/tourController.js
const Tour = require('../models/Tour');
const ApiError = require( '../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');

/**
 * Get all tours with filtering, sorting, and pagination
 */
exports.getTours = async (req, res, next) => {
    try {
        console.log('Incoming query params:', req.query);
      // 1) Filtering
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach(el => delete queryObj[el]);
  
      // 2) Advanced filtering
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  
      let query = Tour.find(JSON.parse(queryStr))
        .where('publishedStatus').equals('published');
  
      // 3) Sorting
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }
  
      // 4) Field limiting
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
      } else {
        query = query.select('-__v');
      }
  
      // 5) Pagination
      const page = req.query.page * 1 || 1;
      const limit = req.query.limit * 1 || 10;
      const skip = (page - 1) * limit;
  
      query = query.skip(skip).limit(limit);
  
      // Execute query
      const tours = await query;
  
      res.status(StatusCodes.OK).json({
        status: 'success',
        results: tours.length,
        data: {
          tours
        }
      });
    } catch (err) {
        console.error('Error in getTours:', err);
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch tours'));
    }
  };
/**
 * Get a single tour by ID
 */
exports.getTourById = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id)
      .populate('stops.attraction')
      .populate('reviews.user', 'name photo');

    if (!tour) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tour not found');
    }

    res.status(httpStatus.OK).json({
      status: 'success',
      data: {
        tour
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Start a tour (tracking)
 */
exports.startTour = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tour not found');
    }

    // In a real app, you would create a TourProgress document here
    res.status(httpStatus.OK).json({
      status: 'success',
      message: 'Tour started successfully',
      data: {
        tour
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complete a tour
 */
exports.completeTour = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tour not found');
    }

    // Add to completedBy array
    tour.completedBy.push({
      user: req.user.id,
      rating,
      feedback: comment
    });

    // Update average rating
    const completedTours = tour.completedBy.filter(c => c.rating);
    if (completedTours.length > 0) {
      const totalRating = completedTours.reduce((sum, c) => sum + c.rating, 0);
      tour.rating.average = totalRating / completedTours.length;
      tour.rating.count = completedTours.length;
    }

    await tour.save();

    res.status(httpStatus.OK).json({
      status: 'success',
      message: 'Tour completed successfully',
      data: {
        tour
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit a tour review
 */
exports.submitTourReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tour not found');
    }

    // Check if user already reviewed
    const alreadyReviewed = tour.reviews.find(
      r => r.user.toString() === req.user.id.toString()
    );

    if (alreadyReviewed) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'You already reviewed this tour');
    }

    // Add review
    tour.reviews.push({
      user: req.user.id,
      rating,
      comment
    });

    // Update average rating
    if (tour.reviews.length > 0) {
      const totalRating = tour.reviews.reduce((sum, r) => sum + r.rating, 0);
      tour.rating.average = totalRating / tour.reviews.length;
      tour.rating.count = tour.reviews.length;
    }

    await tour.save();

    res.status(httpStatus.OK).json({
      status: 'success',
      message: 'Review submitted successfully',
      data: {
        tour
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get tours by category
 */
exports.getToursByCategory = async (req, res, next) => {
    try {
      const { category } = req.params;
      const tours = await Tour.find({ 
        category,
        publishedStatus: 'published'
      }).sort('-createdAt');
  
      res.status(StatusCodes.OK).json({
        status: 'success',
        results: tours.length,
        data: {
          tours
        }
      });
    } catch (err) {
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch tours by category'));
    }
  };
  
  /**
   * Get user's completed tours
   */
  exports.getUserCompletedTours = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const tours = await Tour.find({ 
        'completedBy.user': mongoose.Types.ObjectId(userId)
      });
  
      res.status(StatusCodes.OK).json({
        status: 'success',
        results: tours.length,
        data: {
          tours
        }
      });
    } catch (err) {
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch completed tours'));
    }
  };
  
  /**
   * Create a new tour (admin only)
   */
  exports.createTour = async (req, res, next) => {
    try {
      const { title, description, category, stops, duration, distance, difficulty } = req.body;
      
      const newTour = await Tour.create({
        title,
        description,
        category,
        stops,
        duration,
        distance,
        difficulty,
        createdBy: req.user.id
      });
  
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: {
          tour: newTour
        }
      });
    } catch (err) {
      next(new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create tour'));
    }
  };
  
  /**
   * Update a tour (admin only)
   */
  exports.updateTour = async (req, res, next) => {
    try {
      const { id } = req.params;
      const tour = await Tour.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });
  
      if (!tour) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Tour not found');
      }
  
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
          tour
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * Delete a tour (admin only)
   */
  exports.deleteTour = async (req, res, next) => {
    try {
      const { id } = req.params;
      const tour = await Tour.findByIdAndDelete(id);
  
      if (!tour) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Tour not found');
      }
  
      res.status(StatusCodes.NO_CONTENT).json({
        status: 'success',
        data: null
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * Get all tours for admin (including unpublished)
   */
  exports.getAllToursForAdmin = async (req, res, next) => {
    try {
      const tours = await Tour.find().sort('-createdAt');
  
      res.status(StatusCodes.OK).json({
        status: 'success',
        results: tours.length,
        data: {
          tours
        }
      });
    } catch (err) {
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch tours'));
    }
  };