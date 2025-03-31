// backend/routes/tourRoutes.js
const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const auth = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permissions');

// Debug: Verify controller methods exist
const requiredMethods = [
  'getTours', 'getTourById', 'getToursByCategory',
  'startTour', 'completeTour', 'submitTourReview', 'getUserCompletedTours',
  'createTour', 'updateTour', 'deleteTour', 'getAllToursForAdmin'
];

requiredMethods.forEach(method => {
  if (typeof tourController[method] !== 'function') {
    console.error(`Missing controller method: ${method}`);
  }
});

// Public routes
router.get('/', tourController.getTours);
router.get('/:id', tourController.getTourById);
router.get('/category/:category', tourController.getToursByCategory);

// Protected routes (require authentication)
router.use(auth);

// User tour actions
router.post('/:id/start', tourController.startTour);
router.post('/:id/complete', tourController.completeTour);
router.post('/:id/review', tourController.submitTourReview);
router.get('/user/completed', tourController.getUserCompletedTours);

// Admin routes (require admin permissions)
router.use(checkPermission('admin'));

router.post('/', tourController.createTour);
router.put('/:id', tourController.updateTour);
router.delete('/:id', tourController.deleteTour);
router.get('/admin/all', tourController.getAllToursForAdmin);

module.exports = router;