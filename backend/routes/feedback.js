/**
 * Feedback routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const auth = require('../middlewares/auth');

// Submit general feedback
router.post('/', auth, feedbackController.submitFeedback);

// Get all feedback (admin only)
router.get('/', auth, feedbackController.getAllFeedback);

// Get feedback by ID
router.get('/:id', auth, feedbackController.getFeedbackById);

// Update feedback status (admin only)
router.put('/:id/status', auth, feedbackController.updateFeedbackStatus);

// Get user's submitted feedback
router.get('/user', auth, feedbackController.getUserFeedback);

// Delete feedback (admin only)
router.delete('/:id', auth, feedbackController.deleteFeedback);

// Submit incident report
router.post('/incident', auth, feedbackController.reportIncident);

// Get all incident reports (admin only)
router.get('/incident', auth, feedbackController.getAllIncidents);

// Get incident report by ID
router.get('/incident/:id', auth, feedbackController.getIncidentById);

// Update incident status (admin only)
router.put('/incident/:id/status', auth, feedbackController.updateIncidentStatus);

module.exports = router;
