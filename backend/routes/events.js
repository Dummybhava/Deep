/**
 * Events routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middlewares/auth');

// Get all events
router.get('/', eventController.getAllEvents);

// Get events by category
router.get('/category/:category', eventController.getEventsByCategory);

// Get upcoming events
router.get('/upcoming', eventController.getUpcomingEvents);

// Get events by date range
router.get('/date-range', eventController.getEventsByDateRange);

// Get featured events
router.get('/featured', eventController.getFeaturedEvents);

// Get single event by ID
router.get('/:id', eventController.getEventById);

// Add a new event (admin only)
router.post('/', auth, eventController.addEvent);

// Update an event (admin only)
router.put('/:id', auth, eventController.updateEvent);

// Delete an event (admin only)
router.delete('/:id', auth, eventController.deleteEvent);

// RSVP to an event (requires authentication)
router.post('/:id/rsvp', auth, eventController.rsvpToEvent);

// Get events near a location
router.get('/nearby', eventController.getNearbyEvents);

module.exports = router;
