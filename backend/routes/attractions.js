/**
 * Attractions routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const attractionController = require('../controllers/attractionController');
const auth = require('../middlewares/auth');

// Get all attractions
router.get('/', attractionController.getAllAttractions);

// Get attractions by category
router.get('/category/:category', attractionController.getAttractionsByCategory);

// Get attractions nearby (based on coordinates)
router.get('/nearby', attractionController.getNearbyAttractions);

// Get single attraction by ID
router.get('/:id', attractionController.getAttractionById);

// Get reviews for an attraction
router.get('/:id/reviews', attractionController.getAttractionReviews);

// Add a new attraction (admin only)
router.post('/', auth, attractionController.addAttraction);

// Update an attraction (admin only)
router.put('/:id', auth, attractionController.updateAttraction);

// Delete an attraction (admin only)
router.delete('/:id', auth, attractionController.deleteAttraction);

// Add a review for an attraction (requires authentication)
router.post('/:id/reviews', auth, attractionController.addAttractionReview);

// Routes for Food & Beverage or Retailers
router.get('/type/food', attractionController.getFoodAttractions);
router.get('/type/retail', attractionController.getRetailAttractions);

module.exports = router;
